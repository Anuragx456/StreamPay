// Real wallet integration via @creit.tech/stellar-wallets-kit (v1.9).
//
// This module owns a single StellarWalletsKit instance and exposes thin async
// helpers the wallet store calls. It replaces the previous mock connect/sign.
// The kit renders its own wallet-selector modal (openModal), so the UI just
// asks it to open and hands back the chosen address.
//
// Freighter + Lobstr are wired explicitly; both target Stellar Testnet by
// default (see VITE_NETWORK / NETWORK_PASSPHRASE).

import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule,
  LobstrModule,
  FREIGHTER_ID,
  type ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { NETWORK, NETWORK_PASSPHRASE } from './constants';

/** Map our VITE_NETWORK label to the kit's WalletNetwork enum. */
function resolveNetwork(): WalletNetwork {
  if (NETWORK.toUpperCase() === 'PUBLIC') return WalletNetwork.PUBLIC;
  // Default to testnet for Level 1.
  return WalletNetwork.TESTNET;
}

let kit: StellarWalletsKit | null = null;

/** Lazily build the singleton kit (Freighter default, Lobstr available). */
function getKit(): StellarWalletsKit {
  if (kit) return kit;
  kit = new StellarWalletsKit({
    network: resolveNetwork(),
    selectedWalletId: FREIGHTER_ID,
    modules: [new FreighterModule(), new LobstrModule()],
  });
  return kit;
}

/**
 * Open the kit's wallet-selector modal and resolve with the connected address.
 * Resolves to null if the user closes the modal without picking a wallet.
 * Throws if the selected wallet errors (e.g. Freighter locked or access denied).
 */
export async function openWalletModal(): Promise<{ address: string; walletId: string } | null> {
  const k = getKit();
  return new Promise((resolve, reject) => {
    let settled = false;
    void k.openModal({
      modalTitle: 'Connect a wallet',
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          k.setWallet(option.id);
          const { address } = await k.getAddress();
          settled = true;
          resolve({ address, walletId: option.id });
        } catch (err) {
          settled = true;
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      },
      onClosed: () => {
        // Fires on backdrop/X close. Only resolve null if no wallet was picked.
        if (!settled) resolve(null);
      },
    });
  });
}

/**
 * Sign a transaction XDR with the active wallet, returning the signed XDR.
 * The wallet store injects this into the Soroban client's `signXdr` seam.
 */
export async function signTransactionXdr(xdr: string): Promise<string> {
  const k = getKit();
  const { signedTxXdr } = await k.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  return signedTxXdr;
}

/** Reselect a previously-connected wallet id (e.g. after a reload). */
export function selectWallet(walletId: string): void {
  getKit().setWallet(walletId);
}

/**
 * Return the current wallet's address without opening the modal, or null if it
 * can't be derived (wallet locked, access revoked, extension missing). Used to
 * restore a persisted session on load.
 */
export async function getKitAddress(): Promise<string | null> {
  try {
    const { address } = await getKit().getAddress({ skipRequestAccess: true });
    return address || null;
  } catch {
    return null;
  }
}

/** Tear down the kit's connection (WalletConnect sessions, stored address). */
export async function disconnectWallet(): Promise<void> {
  if (!kit) return;
  try {
    await kit.disconnect();
  } catch {
    // Best-effort: some modules have no session to tear down.
  }
}
