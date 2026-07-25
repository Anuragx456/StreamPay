// Tests for the Level 1 classic-Stellar helpers. These cover the pure/validation
// surface of the wallet → send flow: key validation, the explorer link, and the
// input guards in sendXlmPayment that must reject bad input *before* any network
// call. No Horizon calls are made here.

import { describe, expect, it, vi } from 'vitest';

vi.mock('./walletKit', () => ({ signTransactionXdr: vi.fn() }));
import { isValidPublicKey, explorerTxUrl, sendXlmPayment } from './stellar';

// A structurally valid testnet public key (56 chars, base32, starts with G).
const GOOD_KEY = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

describe('isValidPublicKey', () => {
  it('accepts a well-formed G-key', () => {
    expect(isValidPublicKey(GOOD_KEY)).toBe(true);
    expect(isValidPublicKey(`  ${GOOD_KEY}  `)).toBe(true); // trims
  });

  it('rejects malformed keys', () => {
    expect(isValidPublicKey('')).toBe(false);
    expect(isValidPublicKey('nope')).toBe(false);
    expect(isValidPublicKey(GOOD_KEY.slice(0, 55))).toBe(false); // too short
    expect(isValidPublicKey(GOOD_KEY.replace('G', 'M'))).toBe(false); // wrong prefix
    expect(isValidPublicKey(GOOD_KEY.slice(0, 55) + '0')).toBe(false); // 0 not in base32
  });
});

describe('explorerTxUrl', () => {
  it('builds a stellar.expert testnet link containing the hash', () => {
    const url = explorerTxUrl('deadbeef');
    expect(url).toContain('stellar.expert/explorer/testnet/tx/');
    expect(url).toContain('deadbeef');
  });
});

describe('sendXlmPayment input guards', () => {
  it('rejects a missing/invalid source before any network call', async () => {
    await expect(
      sendXlmPayment({ source: 'bad', destination: GOOD_KEY, amount: 1 }),
    ).rejects.toThrow(/connect a wallet/i);
  });

  it('rejects an invalid destination', async () => {
    await expect(
      sendXlmPayment({ source: GOOD_KEY, destination: 'nope', amount: 1 }),
    ).rejects.toThrow(/not a valid stellar public key/i);
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      sendXlmPayment({ source: GOOD_KEY, destination: GOOD_KEY, amount: 0 }),
    ).rejects.toThrow(/greater than 0/i);
  });
});
