// Maps UI asset labels to their Stellar Asset Contract (SAC) address on the
// active network, and back. Live subscription mode is XLM-only on testnet —
// USDC/EURC stay mock-only until their testnet SAC issuers are wired up here.
//
// ponytail: XLM-only in live mode. To go multi-asset, add the token contract id
// for each label below (get it via `stellar contract id asset --asset CODE:ISSUER`).

import { NETWORK_PASSPHRASE } from './constants';

const IS_TESTNET = NETWORK_PASSPHRASE.includes('Test SDF Network');

// Native XLM SAC ids (deterministic per network).
// Testnet value verified via `stellar contract id asset --asset native --network testnet`.
const NATIVE_SAC_TESTNET = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const NATIVE_SAC_PUBLIC = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA';

const NATIVE_SAC = IS_TESTNET ? NATIVE_SAC_TESTNET : NATIVE_SAC_PUBLIC;

/** Label -> token contract id. Only XLM resolves; others are mock-only. */
export const LABEL_TO_ADDRESS: Record<string, string> = { XLM: NATIVE_SAC };

/** Resolve a UI asset label to its token contract address for live calls. */
export function assetAddress(label: string): string {
  const addr = LABEL_TO_ADDRESS[label];
  if (!addr) {
    throw new Error(
      `${label} is not available on-chain yet — only XLM is supported in live mode.`,
    );
  }
  return addr;
}

/** Reverse map: token contract address -> UI label, falling back to the address. */
export function assetLabel(address: string): string {
  for (const [label, addr] of Object.entries(LABEL_TO_ADDRESS)) {
    if (addr === address) return label;
  }
  return address;
}
