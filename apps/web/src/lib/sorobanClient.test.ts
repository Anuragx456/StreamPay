// Tests for the live-mode Soroban client's pure decoders. The client exposes
// decodeSchedule / decodeEvent / amountToScVal via its `__test` export precisely
// so they can be exercised without a network. These are the translation layer
// between raw contract data and the UI types, so a regression here silently
// corrupts every live-mode view.

import { describe, expect, it } from 'vitest';
import { Address, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk';
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

describe('ScVal round-trip for init_schedule arguments', () => {
  const SCALE = 10_000_000;
  const G_SENDER = 'GCZVCZKC3BP7MWUEMUNVDP6FATV6MN7Q6JC7J4W44ZREFJHNPE2JJYCX';
  const G_RECIPIENT = 'GBBXMI6BRWHILHQUGUG23YODMHADVPVSABAOZ3FVUXRPPQXUVSPETORJ';
  const C_ASSET = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

  it('round-trips each ScVal type through XDR base64', () => {
    const sender = new Address(G_SENDER).toScVal();
    const recipient = new Address(G_RECIPIENT).toScVal();
    const asset = new Address(C_ASSET).toScVal();
    const amount = nativeToScVal(BigInt(Math.round(2.5 * SCALE)), { type: 'i128' });
    const cadence = nativeToScVal(604800n, { type: 'u64' });
    const totalCount = nativeToScVal(12, { type: 'u32' });

    const args = [sender, recipient, amount, asset, cadence, totalCount];

    // Every argument must survive XDR round-trip with identical binary output
    for (const original of args) {
      const xdrBytes = original.toXDR('base64');
      const parsed = xdr.ScVal.fromXDR(xdrBytes, 'base64');
      expect(parsed.toXDR('base64')).toBe(original.toXDR('base64'));
    }

    // Verify scValToNative returns correct JS types for each argument
    expect(scValToNative(sender)).toBe(G_SENDER);
    expect(scValToNative(recipient)).toBe(G_RECIPIENT);
    expect(scValToNative(asset)).toBe(C_ASSET);
    expect(scValToNative(amount)).toBe(25_000_000n);
    expect(scValToNative(cadence)).toBe(604800n);
    expect(scValToNative(totalCount)).toBe(12);
  });

  it('round-trips the entire argument list as an ScVec', () => {
    const args = [
      new Address(G_SENDER).toScVal(),
      new Address(G_RECIPIENT).toScVal(),
      nativeToScVal(BigInt(Math.round(2.5 * SCALE)), { type: 'i128' }),
      new Address(C_ASSET).toScVal(),
      nativeToScVal(604800n, { type: 'u64' }),
      nativeToScVal(12, { type: 'u32' }),
    ];

    const argVec = nativeToScVal(args);
    const xdrBytes = argVec.toXDR('base64');
    const parsed = xdr.ScVal.fromXDR(xdrBytes, 'base64');

    expect(parsed.toXDR('base64')).toBe(argVec.toXDR('base64'));

    const decoded = scValToNative(parsed);
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded[0]).toBe(G_SENDER);
    expect(decoded[1]).toBe(G_RECIPIENT);
    expect(decoded[2]).toBe(25_000_000n);
    expect(decoded[3]).toBe(C_ASSET);
    expect(decoded[4]).toBe(604800n);
    expect(decoded[5]).toBe(12);
  });
});
