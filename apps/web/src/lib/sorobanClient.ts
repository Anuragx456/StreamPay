// Real Soroban client. Mirrors the ContractClient interface used by the UI, but
// talks to the deployed subscription contract over RPC and signs mutating calls
// with the connected wallet (stellar-wallets-kit).
//
// Reads are done via account-less simulation (no wallet needed), so the
// dashboard loads schedules + the event feed before a wallet is connected.
// Mutations (create/deposit/pay/pause/resume/cancel) require the connected
// wallet as source + signer.

import {
  Account,
  Address,
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  SorobanRpc,
} from '@stellar/stellar-sdk';
import type { StreamSnapshot } from './mockClient';
import type { ContractClient } from './contract';
import { CONTRACT_ID, NETWORK_PASSPHRASE, SOROBAN_RPC_URL } from './constants';
import { assetAddress, assetLabel } from './assets';
import type {
  CreateScheduleInput,
  EventPage,
  Schedule,
  ScheduleStatus,
  StreamEvent,
  TransactionProgress,
  TransactionReceipt,
} from './types';

/**
 * Signs a transaction's XDR and returns the signed XDR. The wallet store wires
 * this to stellar-wallets-kit's `signTransaction`. Injected so this module has
 * no direct dependency on the wallet UI/store.
 */
export type SignXdr = (xdr: string) => Promise<string>;

/** How many contiguous schedule ids to probe (ids are monotonic from 1). */
const MAX_SCHEDULE_SCAN = 100;
/** SAC scale: XLM (and every current SAC) uses 7 decimals. */
const SCALE = 10_000_000;
/** Ledgers to backfill when no persisted cursor is available (~24h). */
const EVENT_LOOKBACK_LEDGERS = 17_280;

const server = new SorobanRpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_URL.startsWith('http://'),
});

/** The contract's Status enum, by u32 discriminant. */
const STATUS_BY_INDEX: ScheduleStatus[] = ['Active', 'Paused', 'Ended'];

export async function withCursorRecovery<T>(
  cursor: string | undefined,
  fetchPage: (cursor?: string) => Promise<T>,
): Promise<T> {
  try {
    return await fetchPage(cursor);
  } catch (error) {
    if (!cursor) throw error;
    return fetchPage();
  }
}

function statusIndex(raw: unknown): number {
  if (Array.isArray(raw)) return statusIndex(raw[0]);
  if (typeof raw === 'number' || typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string') {
    const named = STATUS_BY_INDEX.indexOf(raw as ScheduleStatus);
    return named >= 0 ? named : Number(raw);
  }
  const value = raw as {
    discriminant?: number | bigint;
    tag?: string;
    value?: unknown;
  };
  if (value?.tag) return STATUS_BY_INDEX.indexOf(value.tag as ScheduleStatus);
  if (value?.discriminant !== undefined) return Number(value.discriminant);
  if (value?.value !== undefined) return statusIndex(value.value);
  return 0;
}

const toWhole = (v: unknown): number =>
  Number(typeof v === 'bigint' ? v : BigInt(String(v ?? 0))) / SCALE;
const toInt = (v: unknown): number => Number(typeof v === 'bigint' ? v : BigInt(String(v ?? 0)));

/** Map a decoded contract `Schedule` (snake_case) into the UI `Schedule` shape. */
function decodeSchedule(id: string, raw: Record<string, unknown>): Schedule {
  const statusIdx = statusIndex(raw.status);
  return {
    id,
    label: '', // labels are UI-only; the contract doesn't store them.
    sender: String(raw.sender),
    recipient: String(raw.recipient),
    amount: toWhole(raw.amount),
    asset: assetLabel(String(raw.asset)),
    cadenceSecs: toInt(raw.cadence_secs),
    totalCount: toInt(raw.total_count),
    paidCount: toInt(raw.paid_count),
    lastPaidTs: toInt(raw.last_paid_ts),
    deposit: toWhole(raw.deposit),
    status: STATUS_BY_INDEX[statusIdx] ?? 'Active',
    createdTs: toInt(raw.created_ts),
  };
}

/** Decode a raw RPC event into a UI StreamEvent (or null for unknown topics). */
function decodeEvent(ev: SorobanRpc.Api.EventResponse): StreamEvent | null {
  const topics = ev.topic.map((t) => scValToNative(t));
  const kind = String(topics[0]);
  const scheduleId = String(topics[1] ?? '');
  const data = (scValToNative(ev.value) ?? {}) as Record<string, unknown>;
  const ts = Math.floor(new Date(ev.ledgerClosedAt).getTime() / 1000);
  const base = { id: ev.id, scheduleId, txHash: ev.txHash, ts, asset: 'XLM' };

  switch (kind) {
    case 'created':
      return { ...base, type: 'created' };
    case 'payment':
      return { ...base, type: 'payment', amount: toWhole(data.amount) };
    case 'deposit':
      return { ...base, type: 'deposit', amount: toWhole(data.amount) };
    case 'cancel':
      return { ...base, type: 'cancel', amount: toWhole(data.refund) };
    case 'status': {
      const status = statusIndex(data.status);
      return { ...base, type: status === 1 ? 'pause' : 'resume' };
    }
    default:
      return null;
  }
}

/** i128 whole-unit amount -> scaled ScVal the contract expects. */
function amountToScVal(whole: number): xdr.ScVal {
  return nativeToScVal(BigInt(Math.round(whole * SCALE)), { type: 'i128' });
}

const scheduleIdArg = (id: string | number): xdr.ScVal =>
  nativeToScVal(BigInt(id), { type: 'u64' });

class SorobanClient implements ContractClient {
  private contract = new Contract(CONTRACT_ID);

  constructor(
    private sender: () => string | null,
    private sign: SignXdr,
  ) {}

  /**
   * Read-only invocation via simulation. No wallet required — we build the tx
   * from a throwaway source account (simulation ignores its sequence/balance).
   */
  private async simulateRead(method: string, ...args: xdr.ScVal[]): Promise<unknown> {
    const source = new Account(Keypair.random().publicKey(), '0');
    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed for ${method}: ${sim.error}`);
    }
    const retval = sim.result?.retval;
    return retval ? scValToNative(retval) : undefined;
  }

  /**
   * Mutating invocation: build -> prepare (simulate + assemble) -> sign via
   * wallet -> submit -> poll to completion. Throws on any failed status.
   */
  private async invokeSigned(
    method: string,
    args: xdr.ScVal[],
    progress?: TransactionProgress,
  ): Promise<TransactionReceipt> {
    const source = this.requireSender();
    const account = await server.getAccount(source);
    const built = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    // Simulate + attach the Soroban resource footprint/fees before signing.
    const prepared = await server.prepareTransaction(built);
    progress?.('awaiting_signature');
    const signedXdr = await this.sign(prepared.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    progress?.('submitting');
    const sent = await server.sendTransaction(signedTx);
    if (sent.status === 'ERROR' || sent.status === 'TRY_AGAIN_LATER') {
      throw new Error(`Submit failed for ${method}: ${JSON.stringify(sent.errorResult)}`);
    }
    progress?.('pending', sent.hash);

    let got = await server.getTransaction(sent.hash);
    for (let i = 0; i < 15 && got.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      got = await server.getTransaction(sent.hash);
    }
    if (got.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Tx ${sent.hash} ended ${got.status}`);
    }
    return {
      hash: sent.hash,
      value: got.returnValue ? scValToNative(got.returnValue) : undefined,
    };
  }

  private requireSender(): string {
    const s = this.sender();
    if (!s) throw new Error('Connect a wallet first');
    return s;
  }

  /** Probe contiguous schedule ids until the first miss (ids never have gaps). */
  private async probeSchedules(): Promise<Schedule[]> {
    const schedules: Schedule[] = [];
    for (let id = 1; id <= MAX_SCHEDULE_SCAN; id += 1) {
      try {
        const raw = (await this.simulateRead('get_schedule', scheduleIdArg(id))) as
          | Record<string, unknown>
          | undefined;
        if (!raw) break;
        schedules.push(decodeSchedule(String(id), raw));
      } catch {
        break; // ScheduleNotFound — no higher ids exist.
      }
    }
    return schedules;
  }

  /** Fetch events after a cursor, or backfill recent ledgers when no cursor is usable. */
  async getEvents(cursor?: string): Promise<EventPage> {
    const fetchPage = async (after?: string) => {
      const request: SorobanRpc.Server.GetEventsRequest = {
        filters: [{ type: 'contract', contractIds: [CONTRACT_ID] }],
        limit: 100,
      };
      if (after) request.cursor = after;
      else {
      const { sequence } = await server.getLatestLedger();
        request.startLedger = Math.max(1, sequence - EVENT_LOOKBACK_LEDGERS);
      }
      const res = await server.getEvents(request);
      const events = res.events
        .map(decodeEvent)
        .filter((e): e is StreamEvent => e !== null)
        .reverse();
      return { events, cursor: res.events.at(-1)?.pagingToken ?? after };
    };

    return withCursorRecovery(cursor, fetchPage);
  }

  async getSnapshot(): Promise<StreamSnapshot> {
    const [schedules, page] = await Promise.all([this.probeSchedules(), this.getEvents()]);
    return { schedules, events: page.events };
  }

  async initSchedule(
    input: CreateScheduleInput,
    sender: string,
    progress?: TransactionProgress,
  ): Promise<TransactionReceipt<string>> {
    const receipt = await this.invokeSigned(
      'init_schedule',
      [
        new Address(sender).toScVal(),
        new Address(input.recipient).toScVal(),
        amountToScVal(input.amount),
        new Address(assetAddress(input.asset)).toScVal(),
        nativeToScVal(BigInt(input.cadenceSecs), { type: 'u64' }),
        nativeToScVal(input.totalCount, { type: 'u32' }),
      ],
      progress,
    );
    const id = String(receipt.value);
    // The contract creates the schedule with an empty escrow; fund it now so
    // live mode matches the mock's "initial deposit" semantics.
    if (input.initialDeposit > 0) {
      const deposit = await this.deposit(id, input.initialDeposit, progress);
      return { hash: deposit.hash, value: id };
    }
    return { hash: receipt.hash, value: id };
  }

  async deposit(id: string, amount: number, progress?: TransactionProgress): Promise<TransactionReceipt> {
    return this.invokeSigned('deposit', [scheduleIdArg(id), amountToScVal(amount)], progress);
  }

  async payNext(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    return this.invokeSigned('pay_next', [scheduleIdArg(id)], progress);
  }

  async pause(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    return this.invokeSigned('pause', [scheduleIdArg(id)], progress);
  }

  async resume(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    return this.invokeSigned('resume', [scheduleIdArg(id)], progress);
  }

  async cancel(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    return this.invokeSigned('cancel', [scheduleIdArg(id)], progress);
  }
}

/** Factory used by lib/contract.ts when a contract id is configured. */
export function makeSorobanClient(sender: () => string | null, sign: SignXdr): ContractClient {
  return new SorobanClient(sender, sign);
}

// Exported for unit tests (pure decoders, no network).
export const __test = { decodeSchedule, decodeEvent, amountToScVal, statusIndex };
