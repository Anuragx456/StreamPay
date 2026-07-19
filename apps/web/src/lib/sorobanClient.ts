// Real Soroban client. Mirrors the ContractClient interface used by the UI, but
// talks to a deployed subscription contract over RPC and signs mutating calls
// with the connected wallet (stellar-wallets-kit).
//
// IMPORTANT — verification status: this path is written against the
// @stellar/stellar-sdk v12 API (SorobanRpc namespace, TransactionBuilder +
// prepareTransaction, nativeToScVal/scValToNative) which was confirmed against
// the v12 changelog. It has NOT been exercised end-to-end against a live
// deployment in this environment (no contract id / toolchain here). The spots
// most likely to need adjustment on first real run are flagged inline with
// `REVIEW:` comments. Until VITE_CONTRACT_ID is set, lib/contract.ts uses the
// mock client and none of this code runs.

import {
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  SorobanRpc,
} from '@stellar/stellar-sdk';
import type { StreamSnapshot } from './mockClient';
import type { ContractClient } from './contract';
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
} from './constants';
import type { CreateScheduleInput, Schedule, ScheduleStatus, StreamEvent } from './types';

/**
 * Signs a transaction's XDR and returns the signed XDR. The wallet store wires
 * this to stellar-wallets-kit's `signTransaction`. Kept as an injected function
 * so this module has no direct dependency on the wallet UI/store.
 */
export type SignXdr = (xdr: string) => Promise<string>;

/** How many schedule ids to probe when building a snapshot (see getSnapshot). */
const MAX_SCHEDULE_SCAN = 50;

const server = new SorobanRpc.Server(SOROBAN_RPC_URL, {
  // Testnet RPC is https; allowHttp only matters for local/standalone.
  allowHttp: SOROBAN_RPC_URL.startsWith('http://'),
});

/** The contract's on-chain Status enum is emitted as a u32 discriminant. */
const STATUS_BY_INDEX: ScheduleStatus[] = ['Active', 'Paused', 'Ended'];

/**
 * Map a decoded contract `Schedule` (snake_case, i128 as bigint, Address as
 * string) into the UI's `Schedule` shape (camelCase, numbers). Amounts are kept
 * in whole units by dividing out the 7-decimal SAC scale used on-chain.
 */
function decodeSchedule(id: string, raw: Record<string, unknown>): Schedule {
  const scale = 10_000_000; // 7 decimals
  const toNum = (v: unknown): number => Number(typeof v === 'bigint' ? v : BigInt(String(v ?? 0)));
  const statusIdx =
    typeof raw.status === 'number' ? raw.status : Number((raw.status as { discriminant?: number })?.discriminant ?? 0);
  return {
    id,
    label: '', // labels live only in the UI; contract does not store them.
    sender: String(raw.sender),
    recipient: String(raw.recipient),
    amount: toNum(raw.amount) / scale,
    asset: String(raw.asset),
    cadenceSecs: toNum(raw.cadence_secs),
    totalCount: toNum(raw.total_count),
    paidCount: toNum(raw.paid_count),
    lastPaidTs: toNum(raw.last_paid_ts),
    deposit: toNum(raw.deposit) / scale,
    status: STATUS_BY_INDEX[statusIdx] ?? 'Active',
    createdTs: toNum(raw.created_ts),
  };
}

/** i128 whole-unit amount -> scaled ScVal the contract expects. */
function amountToScVal(whole: number): xdr.ScVal {
  const scaled = BigInt(Math.round(whole * 10_000_000));
  return nativeToScVal(scaled, { type: 'i128' });
}

class SorobanClient implements ContractClient {
  private contract = new Contract(CONTRACT_ID);

  constructor(
    private sender: () => string | null,
    private sign: SignXdr,
  ) {}

  /**
   * Read-only invocation via simulation. No signing or submission — we only
   * need the simulated return value. Used by get_schedule.
   */
  private async simulateRead(method: string, ...args: xdr.ScVal[]): Promise<unknown> {
    const account = await server.getAccount(this.requireSender());
    const tx = new TransactionBuilder(account, {
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
    // REVIEW: retval shape is stable in v12; scValToNative decodes the struct.
    const retval = sim.result?.retval;
    return retval ? scValToNative(retval) : undefined;
  }

  /**
   * Mutating invocation: build -> prepare (simulate + assemble) -> sign via
   * wallet -> submit -> poll to completion. Throws on any failed status so the
   * store surfaces the same error UX as the mock path.
   */
  private async invokeSigned(method: string, ...args: xdr.ScVal[]): Promise<unknown> {
    const source = this.requireSender();
    const account = await server.getAccount(source);
    const built = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    // prepareTransaction simulates and attaches the Soroban resource footprint
    // + fees. Required before signing any contract invocation.
    const prepared = await server.prepareTransaction(built);

    const signedXdr = await this.sign(prepared.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    const sent = await server.sendTransaction(signedTx);
    if (sent.status === 'ERROR') {
      throw new Error(`Submit failed for ${method}: ${JSON.stringify(sent.errorResult)}`);
    }

    // Poll until the tx leaves PENDING.
    let got = await server.getTransaction(sent.hash);
    for (let i = 0; i < 10 && got.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      got = await server.getTransaction(sent.hash);
    }
    if (got.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Tx ${sent.hash} ended ${got.status}`);
    }
    return got.returnValue ? scValToNative(got.returnValue) : undefined;
  }

  private requireSender(): string {
    const s = this.sender();
    if (!s) throw new Error('Connect a wallet first');
    return s;
  }

  async getSnapshot(): Promise<StreamSnapshot> {
    // The contract has no enumerate-all function (that would be an unbounded
    // on-chain scan). We probe ids 1..MAX and keep the ones that resolve. A
    // production build would replace this with an indexer / event backfill.
    const schedules: Schedule[] = [];
    for (let id = 1; id <= MAX_SCHEDULE_SCAN; id += 1) {
      try {
        const raw = (await this.simulateRead('get_schedule', nativeToScVal(id, { type: 'u64' }))) as
          | Record<string, unknown>
          | undefined;
        if (raw) schedules.push(decodeSchedule(String(id), raw));
      } catch {
        // ScheduleNotFound (or a gap) — stop scanning at the first miss past 1.
        if (schedules.length > 0) break;
      }
    }
    // REVIEW: event backfill via server.getEvents requires a start ledger and
    // contract-id topic filter; wire this to the same query the watcher uses.
    const events: StreamEvent[] = [];
    return { schedules, events };
  }

  async initSchedule(input: CreateScheduleInput, sender: string): Promise<string> {
    const ret = await this.invokeSigned(
      'init_schedule',
      new Address(sender).toScVal(),
      new Address(input.recipient).toScVal(),
      amountToScVal(input.amount),
      new Address(input.asset).toScVal(),
      nativeToScVal(BigInt(input.cadenceSecs), { type: 'u64' }),
      nativeToScVal(input.totalCount, { type: 'u32' }),
    );
    return String(ret);
  }

  async deposit(id: string, amount: number): Promise<void> {
    await this.invokeSigned('deposit', nativeToScVal(BigInt(id), { type: 'u64' }), amountToScVal(amount));
  }

  async payNext(id: string): Promise<void> {
    await this.invokeSigned('pay_next', nativeToScVal(BigInt(id), { type: 'u64' }));
  }

  async pause(id: string): Promise<void> {
    await this.invokeSigned('pause', nativeToScVal(BigInt(id), { type: 'u64' }));
  }

  async resume(id: string): Promise<void> {
    await this.invokeSigned('resume', nativeToScVal(BigInt(id), { type: 'u64' }));
  }

  async cancel(id: string): Promise<void> {
    await this.invokeSigned('cancel', nativeToScVal(BigInt(id), { type: 'u64' }));
  }
}

/** Factory used by lib/contract.ts when a contract id is configured. */
export function makeSorobanClient(sender: () => string | null, sign: SignXdr): ContractClient {
  return new SorobanClient(sender, sign);
}
