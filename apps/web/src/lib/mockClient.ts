// In-memory implementation of the contract interface used in MOCK MODE.
// It mirrors the semantics of the Soroban contract (timing guards, deposit
// checks, status transitions) so the UI behaves identically with or without a
// deployed contract. lib/contract.ts picks this or the real client at runtime.

import type {
  CreateScheduleInput,
  Schedule,
  ScheduleStatus,
  StreamEvent,
  TransactionProgress,
  TransactionReceipt,
} from './types';
import { seedEvents, seedSchedules } from './mockData';

const nowSecs = () => Math.floor(Date.now() / 1000);

/** Fake but plausible 64-char hex tx hash for mock events. */
function fakeTxHash(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 64; i += 1) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

/** Simulate network latency so skeletons/spinners are visible in the demo. */
function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface StreamSnapshot {
  schedules: Schedule[];
  events: StreamEvent[];
}

export class MockClient {
  private schedules: Schedule[] = seedSchedules();
  private events: StreamEvent[] = seedEvents();
  private nextId = this.schedules.length + 1;

  private pushEvent(e: Omit<StreamEvent, 'id' | 'txHash' | 'ts'>): StreamEvent {
    const event: StreamEvent = {
      ...e,
      id: `e${Date.now()}${Math.floor(Math.random() * 1000)}`,
      txHash: fakeTxHash(),
      ts: nowSecs(),
    };
    this.events = [event, ...this.events];
    return event;
  }

  async getSnapshot(): Promise<StreamSnapshot> {
    return delay({
      schedules: this.schedules.map((s) => ({ ...s })),
      events: this.events.map((e) => ({ ...e })),
    });
  }

  async getEvents(cursor?: string) {
    const index = cursor ? this.events.findIndex((event) => event.id === cursor) : -1;
    const events = cursor && index >= 0 ? this.events.slice(0, index) : this.events;
    return delay({ events: events.map((event) => ({ ...event })), cursor: this.events[0]?.id });
  }

  private async receipt<T>(value: T, progress?: TransactionProgress): Promise<TransactionReceipt<T>> {
    const hash = fakeTxHash();
    progress?.('awaiting_signature');
    progress?.('submitting');
    progress?.('pending', hash);
    return { hash, value };
  }

  async initSchedule(
    input: CreateScheduleInput,
    sender: string,
    progress?: TransactionProgress,
  ): Promise<TransactionReceipt<string>> {
    const id = String(this.nextId);
    this.nextId += 1;
    const schedule: Schedule = {
      id,
      label: input.label || 'Untitled stream',
      sender,
      recipient: input.recipient,
      amount: input.amount,
      asset: input.asset,
      cadenceSecs: input.cadenceSecs,
      totalCount: input.totalCount,
      paidCount: 0,
      lastPaidTs: 0,
      deposit: input.initialDeposit,
      status: 'Active',
      createdTs: nowSecs(),
    };
    this.schedules = [schedule, ...this.schedules];
    this.pushEvent({ type: 'created', scheduleId: id });
    await delay(null);
    return this.receipt(id, progress);
  }

  async deposit(id: string, amount: number, progress?: TransactionProgress): Promise<TransactionReceipt> {
    const s = this.mustGet(id);
    s.deposit += amount;
    this.pushEvent({ type: 'deposit', scheduleId: id, amount, asset: s.asset });
    await delay(null);
    return this.receipt(undefined, progress);
  }

  /**
   * Mirrors on-chain pay_next: enforces the cadence timing guard, deposit
   * sufficiency, and installment cap before disbursing. Throws on violation so
   * the UI can surface the same errors the contract would.
   */
  async payNext(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    const s = this.mustGet(id);
    if (s.status !== 'Active') throw new Error(`Stream is ${s.status.toLowerCase()}, cannot pay`);
    if (s.paidCount >= s.totalCount) throw new Error('All installments already paid');
    if (s.deposit < s.amount) throw new Error('Insufficient escrow deposit');

    const due = (s.lastPaidTs > 0 ? s.lastPaidTs : s.createdTs) + s.cadenceSecs;
    if (nowSecs() < due) {
      throw new Error('Not yet due — cadence interval has not elapsed');
    }

    s.deposit -= s.amount;
    s.paidCount += 1;
    s.lastPaidTs = nowSecs();
    if (s.paidCount >= s.totalCount) s.status = 'Ended';
    this.pushEvent({ type: 'payment', scheduleId: id, amount: s.amount, asset: s.asset });
    await delay(null);
    return this.receipt(undefined, progress);
  }

  private setStatus(id: string, status: ScheduleStatus, type: StreamEvent['type']): void {
    const s = this.mustGet(id);
    s.status = status;
    this.pushEvent({ type, scheduleId: id });
  }

  async pause(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    this.setStatus(id, 'Paused', 'pause');
    await delay(null);
    return this.receipt(undefined, progress);
  }

  async resume(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    this.setStatus(id, 'Active', 'resume');
    await delay(null);
    return this.receipt(undefined, progress);
  }

  async cancel(id: string, progress?: TransactionProgress): Promise<TransactionReceipt> {
    const s = this.mustGet(id);
    const refund = s.deposit;
    s.deposit = 0;
    s.status = 'Ended';
    this.pushEvent({ type: 'cancel', scheduleId: id, amount: refund, asset: s.asset });
    await delay(null);
    return this.receipt(undefined, progress);
  }

  private mustGet(id: string): Schedule {
    const s = this.schedules.find((x) => x.id === id);
    if (!s) throw new Error(`Schedule ${id} not found`);
    return s;
  }
}

/** Singleton so state persists across view navigations in MOCK MODE. */
export const mockClient = new MockClient();
