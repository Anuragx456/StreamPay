// StreamPay off-chain watcher.
//
// Soroban contracts can't self-execute, so this process is what makes the
// recurring-payment premise real: on a cron it scans every schedule in the
// deployed subscription contract and calls `pay_next(id)` on each one that is
// due. `pay_next` is permissionless by design (contracts/subscription/src/lib.rs
// `pay_next`), so the watcher's funded account only needs to pay fees + sign the
// envelope — it does NOT need the sender's auth.
//
// Discovery is a dynamic scan: schedule ids are monotonic from 1, so we probe
// `get_schedule` until the first miss (same approach as the frontend's
// probeSchedules in apps/web/src/lib/sorobanClient.ts). No id list to maintain.
//
// Run: `npm run watcher` (loop) or `npm run watcher:once` (single pass).

import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { Server as SorobanRpcServer, Api as SorobanRpcApi } from '@stellar/stellar-sdk/rpc';

// Load env from the repo root .env (workspace cwd is apps/watcher), then let a
// local .env or real process env override. dotenv does not clobber set vars.
const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(HERE, '../../../.env') });
config();

const WATCHER_SECRET = process.env.WATCHER_SECRET ?? '';
const CONTRACT_ID = process.env.CONTRACT_ID ?? '';
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015';
const POLL_INTERVAL_SECS = Number(process.env.POLL_INTERVAL_SECS ?? 30);

/** How many contiguous ids to probe before giving up (ids are gapless from 1). */
const MAX_SCHEDULE_SCAN = 100;

// ---------------------------------------------------------------------------
// Pure due-decision — the money-path guard. Mirrors the on-chain checks in
// SubscriptionContract::pay_next so the watcher never submits a tx the contract
// would reject. Exported + unit-tested (index.test.ts); no network here.
// ---------------------------------------------------------------------------

/** Status discriminants as stored on-chain. */
export const STATUS = { Active: 0, Paused: 1, Ended: 2 } as const;

/** Normalized view of a contract Schedule the guard operates on. */
export interface WatchSchedule {
  id: string;
  status: number;
  amount: bigint;
  deposit: bigint;
  cadenceSecs: bigint;
  totalCount: number;
  paidCount: number;
  lastPaidTs: bigint;
  createdTs: bigint;
}

/**
 * True when `pay_next(id)` would succeed at `nowSecs`. All four conditions
 * mirror lib.rs `pay_next`: Active, installments remain, escrow covers one
 * installment, and a full cadence has elapsed since the anchor
 * (`last_paid_ts` once paid, else `created_ts`).
 */
export function isDue(s: WatchSchedule, nowSecs: bigint): boolean {
  if (s.status !== STATUS.Active) return false;
  if (s.paidCount >= s.totalCount) return false;
  if (s.deposit < s.amount) return false;
  const anchor = s.lastPaidTs > 0n ? s.lastPaidTs : s.createdTs;
  return nowSecs >= anchor + s.cadenceSecs;
}

// ---------------------------------------------------------------------------
// Decode / network
// ---------------------------------------------------------------------------

const asBig = (v: unknown): bigint => (typeof v === 'bigint' ? v : BigInt(String(v ?? 0)));
const asNum = (v: unknown): number => Number(asBig(v));

/** Coerce the decoded contract Status (number | {tag} | {discriminant}) to u32. */
function normalizeStatus(raw: unknown): number {
  if (Array.isArray(raw)) return normalizeStatus(raw[0]);
  if (typeof raw === 'number' || typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string') return STATUS[raw as keyof typeof STATUS] ?? 0;
  const o = raw as { tag?: string; discriminant?: number };
  if (o?.tag && o.tag in STATUS) return STATUS[o.tag as keyof typeof STATUS];
  return Number(o?.discriminant ?? 0);
}

export const __test = { normalizeStatus, normalizeSchedule };

/** Map a decoded raw `Schedule` (snake_case) to the guard's WatchSchedule. */
function normalizeSchedule(id: string, raw: Record<string, unknown>): WatchSchedule {
  return {
    id,
    status: normalizeStatus(raw.status),
    amount: asBig(raw.amount),
    deposit: asBig(raw.deposit),
    cadenceSecs: asBig(raw.cadence_secs),
    totalCount: asNum(raw.total_count),
    paidCount: asNum(raw.paid_count),
    lastPaidTs: asBig(raw.last_paid_ts),
    createdTs: asBig(raw.created_ts),
  };
}

const scheduleIdArg = (id: number): xdr.ScVal => nativeToScVal(BigInt(id), { type: 'u64' });

class Watcher {
  private server = new SorobanRpcServer(SOROBAN_RPC_URL, {
    allowHttp: SOROBAN_RPC_URL.startsWith('http://'),
  });
  private contract = new Contract(CONTRACT_ID);

  constructor(private keypair: Keypair) {}

  /** Read-only call via simulation from a throwaway source (no fees, no auth). */
  private async simulateRead(method: string, ...args: xdr.ScVal[]): Promise<unknown> {
    const source = new Account(Keypair.random().publicKey(), '0');
    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (SorobanRpcApi.isSimulationError(sim)) {
      throw new Error(`simulate ${method} failed: ${sim.error}`);
    }
    const retval = sim.result?.retval;
    return retval ? scValToNative(retval) : undefined;
  }

  /** Probe ids 1..N until the first miss; return the live schedules. */
  private async scanSchedules(): Promise<WatchSchedule[]> {
    const out: WatchSchedule[] = [];
    for (let id = 1; id <= MAX_SCHEDULE_SCAN; id += 1) {
      try {
        const raw = (await this.simulateRead('get_schedule', scheduleIdArg(id))) as
          | Record<string, unknown>
          | undefined;
        if (!raw) break;
        out.push(normalizeSchedule(String(id), raw));
      } catch {
        break; // ScheduleNotFound — no higher ids exist.
      }
    }
    return out;
  }

  /** Build → prepare → sign (keypair) → submit → poll `pay_next(id)`. */
  private async payNext(id: string): Promise<string> {
    const account = await this.server.getAccount(this.keypair.publicKey());
    const built = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(this.contract.call('pay_next', scheduleIdArg(Number(id))))
      .setTimeout(30)
      .build();

    const prepared = await this.server.prepareTransaction(built);
    prepared.sign(this.keypair);

    const sent = await this.server.sendTransaction(prepared);
    if (sent.status === 'ERROR') {
      throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
    }

    let got = await this.server.getTransaction(sent.hash);
    for (let i = 0; i < 15 && got.status === SorobanRpcApi.GetTransactionStatus.NOT_FOUND; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      got = await this.server.getTransaction(sent.hash);
    }
    if (got.status !== SorobanRpcApi.GetTransactionStatus.SUCCESS) {
      throw new Error(`tx ${sent.hash} ended ${got.status}`);
    }
    return sent.hash;
  }

  /** One pass: scan, then pay every due schedule. Per-schedule errors are logged, not fatal. */
  async tick(): Promise<void> {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const schedules = await this.scanSchedules();
    log(`scan: ${schedules.length} schedule(s)`);

    for (const s of schedules) {
      if (!isDue(s, now)) {
        log(`  #${s.id} skipped (${skipReason(s, now)})`);
        continue;
      }
      try {
        log(`  #${s.id} due → paying…`);
        const hash = await this.payNext(s.id);
        log(`  #${s.id} paid, tx ${hash}`);
      } catch (err) {
        log(`  #${s.id} pay_next error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

/** Human-readable reason a schedule was skipped (for the log only). */
function skipReason(s: WatchSchedule, now: bigint): string {
  if (s.status !== STATUS.Active) return 'not active';
  if (s.paidCount >= s.totalCount) return 'complete';
  if (s.deposit < s.amount) return 'insufficient escrow';
  return 'not yet due';
}

function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[watcher ${new Date().toISOString()}] ${msg}`);
}

async function main(): Promise<void> {
  if (!WATCHER_SECRET) throw new Error('WATCHER_SECRET is required (fund it on testnet via Friendbot).');
  if (!CONTRACT_ID) throw new Error('CONTRACT_ID is required.');

  const keypair = Keypair.fromSecret(WATCHER_SECRET);
  const watcher = new Watcher(keypair);
  const once = process.argv.includes('--once');

  log(`watching ${CONTRACT_ID} as ${keypair.publicKey()} (${once ? 'single pass' : `every ${POLL_INTERVAL_SECS}s`})`);

  await watcher.tick();
  if (once) return;

  // ponytail: fixed-interval poll, no backoff. Fine for a demo watcher; add
  // jitter/backoff if it ever runs against a busy contract.
  setInterval(() => {
    void watcher.tick().catch((err) => log(`tick error: ${err instanceof Error ? err.message : String(err)}`));
  }, POLL_INTERVAL_SECS * 1000);
}

// Only run when executed as a script (not when imported by the test).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    log(`fatal: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
