// Wallet store. In MOCK MODE we simulate a connected key so the whole UI is
// demoable without a browser extension. STEP 4 replaces the connect/disconnect
// internals with @creit.tech/stellar-wallets-kit while keeping this shape.

import { create } from 'zustand';

/** A demo public key used until a real wallet is connected in STEP 4. */
const DEMO_KEY = 'GSENDERDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

export type WalletId = 'freighter' | 'lobstr' | 'demo';

interface WalletState {
  publicKey: string | null;
  walletId: WalletId | null;
  connecting: boolean;
  /** Connect using a chosen wallet. Mock impl resolves instantly. */
  connect: (walletId: WalletId) => Promise<void>;
  disconnect: () => void;
  /**
   * Sign a transaction's XDR and return the signed XDR. lib/sorobanClient.ts
   * injects this into the real client in live mode. The mock impl echoes the
   * XDR back unchanged (nothing submits it), so the live path stays type-safe
   * without pulling the wallet kit into MOCK MODE. STEP 4 replaces this with
   * the kit's `signTransaction`.
   */
  signXdr: (xdr: string) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set) => ({
  publicKey: null,
  walletId: null,
  connecting: false,
  connect: async (walletId) => {
    set({ connecting: true });
    // Simulate the wallet-kit handshake latency.
    await new Promise((r) => setTimeout(r, 400));
    set({ publicKey: DEMO_KEY, walletId, connecting: false });
  },
  disconnect: () => set({ publicKey: null, walletId: null }),
  signXdr: async (xdr) => xdr,
}));
