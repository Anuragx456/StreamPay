// Tests for the in-memory MockClient. These exercise the same semantics the
// Soroban contract enforces (timing guard, escrow sufficiency, full-payout ->
// Ended, cancel refund), so the mock stays a faithful stand-in for the real
// contract while the UI runs standalone.
//
// The client simulates network latency with setTimeout and reads Date.now() for
// its cadence guard, so we drive both with Vitest fake timers: setSystemTime()
// controls "now" for the timing checks, and advanceTimersByTimeAsync() flushes
// the simulated latency so awaited calls resolve.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockClient } from './mockClient';
import type { CreateScheduleInput } from './types';

const DAY = 86_400_000; // ms
const WEEK_SECS = 7 * 86_400;

/** Resolve a pending client call by flushing its simulated-latency timer. */
async function run<T>(p: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(500);
  return p;
}

/**
 * Assert a pending client call rejects. The matcher is attached BEFORE the
 * timers are advanced, otherwise flushing the latency timer settles the promise
 * as rejected while it's still unhandled and Vitest reports an unhandled
 * rejection (even though the assertion itself passes).
 */
async function expectReject(p: Promise<unknown>, re: RegExp): Promise<void> {
  const assertion = expect(p).rejects.toThrow(re);
  await vi.advanceTimersByTimeAsync(500);
  await assertion;
}

const baseInput = (over: Partial<CreateScheduleInput> = {}): CreateScheduleInput => ({
  recipient: 'GRECIPIENTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  label: 'Test stream',
  amount: 10,
  asset: 'USDC',
  cadenceSecs: WEEK_SECS,
  totalCount: 3,
  initialDeposit: 30,
  ...over,
});

const SENDER = 'GSENDERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MockClient.initSchedule', () => {
  it('creates an active schedule with the initial deposit escrowed', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput(), SENDER));

    const { schedules } = await run(client.getSnapshot());
    const created = schedules.find((s) => s.id === id);

    expect(created).toBeDefined();
    expect(created?.status).toBe('Active');
    expect(created?.sender).toBe(SENDER);
    expect(created?.deposit).toBe(30);
    expect(created?.paidCount).toBe(0);
    expect(created?.lastPaidTs).toBe(0);
  });

  it('emits a "created" event for the new schedule', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput(), SENDER));

    const { events } = await run(client.getSnapshot());
    expect(events.some((e) => e.type === 'created' && e.scheduleId === id)).toBe(true);
  });
});

describe('MockClient.deposit', () => {
  it('adds to the escrow balance', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput({ initialDeposit: 0 }), SENDER));

    await run(client.deposit(id, 50));

    const { schedules } = await run(client.getSnapshot());
    expect(schedules.find((s) => s.id === id)?.deposit).toBe(50);
  });
});

describe('MockClient.payNext timing guard', () => {
  it('rejects a payment before one cadence has elapsed', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput(), SENDER));

    // created_ts == now (0). Nothing is due yet.
    await expectReject(client.payNext(id), /not yet due/i);
  });

  it('allows exactly one payment per elapsed cadence', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput(), SENDER));

    // Advance one week: now due.
    vi.setSystemTime(7 * DAY);
    await run(client.payNext(id));

    let snap = await run(client.getSnapshot());
    expect(snap.schedules.find((s) => s.id === id)?.paidCount).toBe(1);
    expect(snap.schedules.find((s) => s.id === id)?.deposit).toBe(20);

    // A second payment in the same interval is a double-withdrawal: rejected.
    await expectReject(client.payNext(id), /not yet due/i);

    // After another week it's due again.
    vi.setSystemTime(14 * DAY);
    await run(client.payNext(id));
    snap = await run(client.getSnapshot());
    expect(snap.schedules.find((s) => s.id === id)?.paidCount).toBe(2);
  });

  it('rejects payment when escrow is insufficient even if due', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput({ initialDeposit: 0 }), SENDER));

    vi.setSystemTime(7 * DAY);
    await expectReject(client.payNext(id), /insufficient/i);
  });
});

describe('MockClient full payout', () => {
  it('marks the schedule Ended after the final installment', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput({ totalCount: 3, initialDeposit: 30 }), SENDER));

    for (let week = 1; week <= 3; week += 1) {
      vi.setSystemTime(week * 7 * DAY);
      await run(client.payNext(id));
    }

    const { schedules } = await run(client.getSnapshot());
    const s = schedules.find((x) => x.id === id);
    expect(s?.paidCount).toBe(3);
    expect(s?.status).toBe('Ended');
    expect(s?.deposit).toBe(0);

    // No further payments on an ended schedule.
    vi.setSystemTime(4 * 7 * DAY);
    await expectReject(client.payNext(id), /ended/i);
  });
});

describe('MockClient.cancel', () => {
  it('ends the schedule and records the refunded remainder', async () => {
    const client = new MockClient();
    const id = await run(client.initSchedule(baseInput({ initialDeposit: 30 }), SENDER));

    await run(client.cancel(id));

    const { schedules, events } = await run(client.getSnapshot());
    expect(schedules.find((s) => s.id === id)?.status).toBe('Ended');
    expect(schedules.find((s) => s.id === id)?.deposit).toBe(0);

    const cancelEvt = events.find((e) => e.type === 'cancel' && e.scheduleId === id);
    expect(cancelEvt?.amount).toBe(30); // remaining escrow refunded
  });
});
