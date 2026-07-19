// Wallet store — real integration for the Level 1 flow.
//
// Connect/disconnect go through @creit.tech/stellar-wallets-kit (Freighter /
// Lobstr) on Stellar Testnet; the connected key's native XLM balance is fetched
// from Horizon and held here for the UI. `signXdr` is wired to the kit so the
// Soroban client (live mode) and the classic payment path share one signer.
//
// The kit persists the last selected wallet, so on load we restore the session
// if one exists (getAddress succeeds silently for an already-authorized wallet).

import { create } from 'zustand';
import {
  openWalletModal,
  signTransactionXdr,
  disconnectWallet,
  selectWallet,
  getKitAddress,
} from '../lib/walletKit';
import { fetchXlmBalance } from '../lib/stellar';
import { toast } from './toast';

/** Wallet ids the kit reports; kept loose since the kit owns the list. */
export type WalletId = string;

const STORAGE_KEY = 'streampay:wallet';

interface WalletState {
  publicKey: string | null;
  walletId: WalletId | null;
  connecting: boolean;

  /** Native XLM balance of the connected account (whole XLM). */
  balance: number | null;
  /** False when the account isn't funded on-chain yet (testnet friendbot). */
  funded: boolean;
  balanceLoading: boolean;

  /** Open the wallet-kit modal and connect the chosen wallet. */
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Refresh the connected account's XLM balance from Horizon. */
  refreshBalance: () => Promise<void>;
  /** Restore a persisted wallet session on app load, if any. */
  restore: () => Promise<void>;

  /**
   * Sign a transaction's XDR and return the signed XDR. Injected into the real
   * Soroban client (lib/contract.ts) and used by the classic XLM send path.
   */
  signXdr: (xdr: string) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: null,
  walletId: null,
  connecting: false,
  balance: null,
  funded: false,
  balanceLoading: false,

  connect: async () => {
    set({ connecting: true });
    try {
      const result = await openWalletModal();
      if (!result) {
        // User closed the modal without choosing a wallet.
        set({ connecting: false });
        return;
      }
      const { address, walletId } = result;
      localStorage.setItem(STORAGE_KEY, walletId);
      set({ publicKey: address, walletId, connecting: false });
      toast.success('Wallet connected', address);
      // Fetch balance in the background.
      void get().refreshBalance();
    } catch (err) {
      set({ connecting: false });
      toast.error(
        'Connection failed',
        err instanceof Error ? err.message : 'Could not connect the wallet.',
      );
    }
  },

  disconnect: async () => {
    await disconnectWallet();
    localStorage.removeItem(STORAGE_KEY);
    set({ publicKey: null, walletId: null, balance: null, funded: false });
  },

  refreshBalance: async () => {
    const key = get().publicKey;
    if (!key) return;
    set({ balanceLoading: true });
    try {
      const { xlm, funded } = await fetchXlmBalance(key);
      set({ balance: xlm, funded, balanceLoading: false });
    } catch (err) {
      set({ balanceLoading: false });
      toast.error(
        'Balance unavailable',
        err instanceof Error ? err.message : 'Could not fetch balance from Horizon.',
      );
    }
  },

  restore: async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      selectWallet(stored);
      // Re-derive the address from the already-authorized wallet without
      // opening the modal.
      const address = await getKitAddress();
      if (address) {
        set({ publicKey: address, walletId: stored });
        void get().refreshBalance();
      }
    } catch {
      // Stored wallet no longer authorized — clear it silently.
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  signXdr: (xdr) => signTransactionXdr(xdr),
}));
