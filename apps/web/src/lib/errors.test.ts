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
    ['Authorization: Only the stream sender can cancel this stream. (AuthError)',
     'Only the stream sender can perform this action.'],
    ['HostError: Error(Contract, #4) while invoking',
     'Only the stream sender can perform this action.'],
    ['require_auth check failed for method cancel',
     'Only the stream sender can perform this action.'],
    ['not authorized to manage this stream',
     'Only the stream sender can perform this action.'],
    ['Sender does not match', 'Sender does not match'], // raw fallback when no pattern matches
  ])('maps %s', (input, expected) => expect(errorMessage(new Error(input))).toBe(expected));
});
