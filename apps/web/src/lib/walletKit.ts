// Real wallet integration via @creit.tech/stellar-wallets-kit (v2.5).
//
// This module owns the StellarWalletsKit static API and exposes thin async
// helpers the wallet store calls. The kit renders its own auth modal with a
// wallet-selector UI, so the app just asks it to open and hands back the
// chosen address.
//
// All 12 Stellar wallets are supported via defaultModules() — Albedo,
// Freighter, Lobstr, Rabet, xBull, Hana, Klever, OneKey, Bitget, Fordefi,
// CactusLink, and Dcent. The kit's built-in auth modal handles selection,
// installation prompts, and availability checks.

import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit/sdk';
import { SwkAppDarkTheme, KitEventType, Networks } from '@creit.tech/stellar-wallets-kit/types';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { NETWORK_PASSPHRASE } from './constants';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let initialized = false;
/** Last wallet id captured from the WALLET_SELECTED event during auth. */
let lastWalletId: string | null = null;
/** Map our NETWORK_PASSPHRASE to the kit's Networks enum. */
function resolveNetwork(): Networks {
  if (NETWORK_PASSPHRASE.includes('Public Global Stellar Network')) return Networks.PUBLIC;
  return Networks.TESTNET;
}

/** One-time lazy init (safe under HMR due to the flag guard). */
function ensureInit(): void {
  if (initialized) return;
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: resolveNetwork(),
    theme: SwkAppDarkTheme,
  });
  // Track which wallet the user picks so openWalletModal can return a walletId.
  StellarWalletsKit.on(
    KitEventType.WALLET_SELECTED,
    (event) => {
      lastWalletId = event.payload.id ?? null;
    },
  );
  initialized = true;
}

// ---------------------------------------------------------------------------
// Public API — all 5 exports preserve their v1 signatures so no caller changes
// are needed (store/wallet.ts, stellar.ts, sorobanClient.ts).
// ---------------------------------------------------------------------------

/**
 * Open the kit's built-in auth modal and resolve with the connected address.
 * Resolves to null if the user closes the modal without connecting a wallet.
 * Throws if the selected wallet errors (e.g. Freighter locked or access denied).
 */
export async function openWalletModal(): Promise<{ address: string; walletId: string } | null> {
  ensureInit();
  try {
    const { address } = await StellarWalletsKit.authModal();
    if (!address) return null;
    return { address, walletId: lastWalletId ?? 'freighter' };
  } catch {
    // User closed the modal or wallet access was denied.
    return null;
  }
}

/**
 * Sign a transaction XDR with the active wallet, returning the signed XDR.
 * The wallet store injects this into the Soroban client's `signXdr` seam.
 */
export async function signTransactionXdr(xdr: string): Promise<string> {
  ensureInit();
  // v2 requires the connected address — resolve it from the kit's in-memory state.
  const { address } = await StellarWalletsKit.getAddress();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  return signedTxXdr;
}

/** Reselect a previously-connected wallet id (e.g. after a reload). */
export function selectWallet(walletId: string): void {
  ensureInit();
  StellarWalletsKit.setWallet(walletId);
}

/**
 * Return the current wallet's address without opening the modal, or null if it
 * can't be derived (wallet locked, access revoked, extension missing). Used to
 * restore a persisted session on load.
 */
export async function getKitAddress(): Promise<string | null> {
  ensureInit();
  try {
    const { address } = await StellarWalletsKit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

/** Tear down the kit's connection (WalletConnect sessions, stored address). */
export async function disconnectWallet(): Promise<void> {
  if (!initialized) return;
  try {
    await StellarWalletsKit.disconnect();
  } catch {
    // Best-effort: some modules have no session to tear down.
  }
  lastWalletId = null;
}
