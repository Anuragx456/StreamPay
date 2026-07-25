// Tests for the live-mode Soroban client's pure decoders. The client exposes
// decodeSchedule / decodeEvent / amountToScVal via its `__test` export precisely
// so they can be exercised without a network. These are the translation layer
// between raw contract data and the UI types, so a regression here silently
// corrupts every live-mode view.

import { describe, expect, it } from 'vitest';
import { nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { __test, withCursorRecovery } from './sorobanClient';

const { decodeSchedule, decodeEvent, amountToScVal } = __test;

// Raw contract Schedule shape (snake_case, scaled i128 amounts as bigint).
const rawSchedule = {
  sender: 'GSENDER',
  recipient: 'GRECIPIENT',
  amount: 10_000_000n, // 1.0 in 7-decimal units
  asset: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // native SAC (testnet)
  cadence_secs: 3600n,
  total_count: 12n,
  paid_count: 3n,
  last_paid_ts: 1_700_000_000n,
  deposit: 90_000_000n, // 9.0
  status: 1, // Paused
  created_ts: 1_699_000_000n,
};

describe('decodeSchedule', () => {
  it('maps snake_case fields and scales i128 amounts to whole units', () => {
    const s = decodeSchedule('7', rawSchedule);
    expect(s.id).toBe('7');
    expect(s.sender).toBe('GSENDER');
    expect(s.recipient).toBe('GRECIPIENT');
    expect(s.amount).toBe(1); // 10_000_000 / 1e7
    expect(s.deposit).toBe(9);
    expect(s.cadenceSecs).toBe(3600);
    expect(s.totalCount).toBe(12);
    expect(s.paidCount).toBe(3);
    expect(s.asset).toBe('XLM'); // native SAC resolves back to the XLM label
  });

  it('maps the status discriminant to the label (1 → Paused)', () => {
    expect(decodeSchedule('1', rawSchedule).status).toBe('Paused');
    expect(decodeSchedule('1', { ...rawSchedule, status: 0 }).status).toBe('Active');
    expect(decodeSchedule('1', { ...rawSchedule, status: 2 }).status).toBe('Ended');
    expect(decodeSchedule('1', { ...rawSchedule, status: 1n }).status).toBe('Paused');
    expect(decodeSchedule('1', { ...rawSchedule, status: { tag: 'Ended' } }).status).toBe('Ended');
    expect(decodeSchedule('1', { ...rawSchedule, status: ['Paused'] }).status).toBe('Paused');
  });
});

/** Build a minimal EventResponse-like object the decoder accepts. */
function makeEvent(topics: unknown[], value: Record<string, unknown>) {
  return {
    id: 'ev1',
    txHash: 'abc123',
    ledgerClosedAt: '2024-01-01T00:00:00Z',
    topic: topics.map((t) => nativeToScVal(t)),
    value: nativeToScVal(value),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('decodeEvent', () => {
  it('decodes a payment event with a scaled amount', () => {
    const ev = decodeEvent(makeEvent(['payment', 5n], { amount: 20_000_000n }));
    expect(ev?.type).toBe('payment');
    expect(ev?.scheduleId).toBe('5');
    expect(ev?.amount).toBe(2); // 20_000_000 / 1e7
    expect(ev?.txHash).toBe('abc123');
  });

  it('decodes created / deposit / cancel topics', () => {
    expect(decodeEvent(makeEvent(['created', 1n], {}))?.type).toBe('created');
    expect(decodeEvent(makeEvent(['deposit', 1n], { amount: 5_000_000n }))?.type).toBe('deposit');
    const cancel = decodeEvent(makeEvent(['cancel', 1n], { refund: 5_000_000n }));
    expect(cancel?.type).toBe('cancel');
    expect(cancel?.amount).toBe(0.5);
  });

  it('maps a status event to pause/resume by discriminant', () => {
    expect(decodeEvent(makeEvent(['status', 1n], { status: 1 }))?.type).toBe('pause');
    expect(decodeEvent(makeEvent(['status', 1n], { status: 0 }))?.type).toBe('resume');
    expect(decodeEvent(makeEvent(['status', 1n], { status: 1n }))?.type).toBe('pause');
  });

  it('returns null for an unknown topic', () => {
    expect(decodeEvent(makeEvent(['mystery', 1n], {}))).toBeNull();
  });
});

describe('amountToScVal', () => {
  it('round-trips a whole amount to a scaled i128', () => {
    const scaled = scValToNative(amountToScVal(2.5));
    expect(BigInt(scaled)).toBe(25_000_000n);
  });
});

describe('cursor recovery', () => {
  it('retries from a recent-ledger backfill when a stored cursor expires', async () => {
    const calls: Array<string | undefined> = [];
    const page = await withCursorRecovery('expired', async (cursor) => {
      calls.push(cursor);
      if (cursor) throw new Error('cursor is outside retention window');
      return { events: [], cursor: 'recovered' };
    });

    expect(calls).toEqual(['expired', undefined]);
    expect(page.cursor).toBe('recovered');
  });
});
