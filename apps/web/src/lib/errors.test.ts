import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it.each([
    ['Freighter extension is locked', 'Wallet is unavailable or locked.'],
    ['User rejected request', 'Signature request was rejected.'],
    ['Error(Contract, #3): InsufficientDeposit', 'Contract escrow is insufficient for this payment.'],
    ['Error(Contract, #3)', 'Contract escrow is insufficient for this payment.'],
    ['op_underfunded', 'Insufficient XLM balance.'],
    ['RPC timeout while submitting', 'Stellar RPC could not submit or confirm the transaction.'],
  ])('maps %s', (input, expected) => expect(errorMessage(new Error(input))).toBe(expected));
});
