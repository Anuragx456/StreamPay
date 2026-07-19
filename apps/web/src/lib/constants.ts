import type { Cadence } from './types';

/** Cadence presets offered in the create form. */
export const CADENCES: Cadence[] = [
  { label: 'Every minute (demo)', secs: 60 },
  { label: 'Hourly', secs: 3600 },
  { label: 'Daily', secs: 86400 },
  { label: 'Weekly', secs: 604800 },
  { label: 'Bi-weekly', secs: 1209600 },
  { label: 'Monthly', secs: 2629800 },
  { label: 'Quarterly', secs: 7889400 },
];

/** Assets selectable in the UI. In real mode these map to token contract ids. */
export const ASSETS = ['XLM', 'USDC', 'EURC'] as const;

/**
 * Whether the app talks to a real deployed contract. When VITE_CONTRACT_ID is
 * unset we run fully in-memory (MOCK MODE) so the UI is demoable standalone.
 */
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? '';
export const IS_MOCK = CONTRACT_ID.trim() === '';

export const NETWORK = import.meta.env.VITE_NETWORK ?? 'TESTNET';
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015';
export const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';
