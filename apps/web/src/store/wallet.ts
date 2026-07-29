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
import { useMockModeStore } from './mockMode';
import { clearClientCache } from '../lib/contract';
import { useStreamsStore } from './streams';
import { toast } from './toast';
import { errorMessage } from '../lib/errors';

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

const isDemoMode = typeof window !== 'undefined' && (window.location.search.includes('demo=1') || localStorage.getItem('streampay:demo') === '1');

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: isDemoMode ? 'GB2Y4P4QW5X6E7R2T3Y4U5I6O7P2A3S4D5F6G7H2J3K4L5M6N7O2P3Q4' : null,
  walletId: isDemoMode ? 'freighter' : null,
  connecting: false,
  balance: isDemoMode ? 10000.0 : null,
  funded: isDemoMode ? true : false,
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

      // Auto-switch to live mode now that a wallet is connected.
      if (useMockModeStore.getState().hasContractId) {
        useMockModeStore.getState().setIsMock(false);
        clearClientCache();
        useStreamsStore.getState().reset();
      }
    } catch (err) {
      set({ connecting: false });
      toast.error(
        'Connection failed',
        errorMessage(err),
      );
    }
  },

  disconnect: async () => {
    await disconnectWallet();
    localStorage.removeItem(STORAGE_KEY);
    set({ publicKey: null, walletId: null, balance: null, funded: false });
    // Return to mock mode so the app stays explorable without a wallet.
    // This is an intentional product decision for a demo-oriented app:
    // on disconnect the user sees seed data rather than a blank slate,
    // making it immediately obvious what the UI looks like when populated.
    // A production-only app would show an empty "connect a wallet" state.
    useMockModeStore.getState().setIsMock(true);
    clearClientCache();
    useStreamsStore.getState().reset();
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
    if (typeof window !== 'undefined' && (window.location.search.includes('demo=1') || localStorage.getItem('streampay:demo') === '1')) {
      set({
        publicKey: 'GB2Y4P4QW5X6E7R2T3Y4U5I6O7P2A3S4D5F6G7H2J3K4L5M6N7O2P3Q4',
        walletId: 'freighter',
        balance: 10000.0,
        funded: true,
      });
      return;
    }
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
        // A re-authorised wallet means we should go live — but only when a
        // contract id is configured.
        if (useMockModeStore.getState().hasContractId) {
          useMockModeStore.getState().setIsMock(false);
          clearClientCache();
          useStreamsStore.getState().reset();
        }
      }
    } catch {
      // Stored wallet no longer authorized — clear it silently.
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  signXdr: (xdr) => signTransactionXdr(xdr),
}));

