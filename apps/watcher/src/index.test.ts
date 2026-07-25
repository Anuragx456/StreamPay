// Unit tests for the watcher's pure due-decision. This is the money-path guard:
// it must mirror the on-chain checks in SubscriptionContract::pay_next exactly,
// or the watcher will submit txs the contract rejects (wasting fees) or skip
// payments it should make. No network — just the guard.

import { describe, expect, it } from 'vitest';
import { __test, isDue, STATUS, type WatchSchedule } from './index';

const WEEK = 604_800n;

const base = (over: Partial<WatchSchedule> = {}): WatchSchedule => ({
  id: '1',
  status: STATUS.Active,
  amount: 10n,
  deposit: 30n,
  cadenceSecs: WEEK,
  totalCount: 3,
  paidCount: 0,
  lastPaidTs: 0n,
  createdTs: 1000n,
  ...over,
});

describe('isDue', () => {
  it('is not due before one cadence has elapsed since creation', () => {
    const s = base();
    expect(isDue(s, 1000n)).toBe(false); // exactly created_ts
    expect(isDue(s, 1000n + WEEK - 1n)).toBe(false);
  });

  it('is due once a full cadence has elapsed since the anchor', () => {
    expect(isDue(base(), 1000n + WEEK)).toBe(true);
  });

  it('uses last_paid_ts as the anchor after the first payment', () => {
    const s = base({ paidCount: 1, lastPaidTs: 5000n });
    expect(isDue(s, 5000n + WEEK - 1n)).toBe(false);
    expect(isDue(s, 5000n + WEEK)).toBe(true);
  });

  it('is never due when paused or ended', () => {
    const now = 1000n + WEEK;
    expect(isDue(base({ status: STATUS.Paused }), now)).toBe(false);
    expect(isDue(base({ status: STATUS.Ended }), now)).toBe(false);
  });

  it('is not due once all installments are paid', () => {
    const s = base({ paidCount: 3, totalCount: 3, lastPaidTs: 5000n });
    expect(isDue(s, 5000n + WEEK)).toBe(false);
  });

  it('is not due when escrow cannot cover one installment', () => {
    const s = base({ deposit: 9n, amount: 10n });
    expect(isDue(s, 1000n + WEEK)).toBe(false);
  });

  it('is due when escrow exactly covers one installment', () => {
    const s = base({ deposit: 10n, amount: 10n });
    expect(isDue(s, 1000n + WEEK)).toBe(true);
  });
});

describe('status decoding', () => {
  it('accepts SDK number, bigint, tag, and discriminant representations', () => {
    expect(__test.normalizeStatus(1)).toBe(1);
    expect(__test.normalizeStatus(2n)).toBe(2);
    expect(__test.normalizeStatus({ tag: 'Paused' })).toBe(1);
    expect(__test.normalizeStatus({ discriminant: 2 })).toBe(2);
    expect(__test.normalizeStatus(['Paused'])).toBe(1);
  });
});
