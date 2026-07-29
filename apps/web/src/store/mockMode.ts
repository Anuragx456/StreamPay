// Runtime mock-mode toggle. When the user toggles mock mode on/off from the
// sidebar, the preference is persisted in localStorage and overrides the
// compile-time VITE_CONTRACT_ID check. The contract facade (lib/contract.ts)
// reads this store to decide which client to use.
//
// If VITE_CONTRACT_ID is empty at build time, live mode is unavailable
// regardless of this toggle — hasContractId reflects that.

import { create } from 'zustand';
import { CONTRACT_ID } from '../lib/constants';

const STORAGE_KEY = 'streampay:mock-mode';

/**
 * Load the initial mock-mode preference. localStorage takes precedence so a
 * user-chosen toggle survives refreshes; otherwise falls back to the
 * compile-time default (empty VITE_CONTRACT_ID → mock mode).
 */
function loadInitial(): boolean {
  if (typeof window === 'undefined') return CONTRACT_ID.trim() === '';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return CONTRACT_ID.trim() === '';
}

interface MockModeState {
  /** Whether the app should use the in-memory mock client. */
  isMock: boolean;
  /** Whether a real contract id was configured at build time. */
  hasContractId: boolean;
  /** Toggle between mock and live mode. No-op when !hasContractId. */
  toggle: () => void;
}

export const useMockModeStore = create<MockModeState>((set, get) => ({
  isMock: loadInitial(),
  hasContractId: CONTRACT_ID.trim() !== '',

  toggle: () => {
    const { hasContractId } = get();
    if (!hasContractId) return;
    set((state) => {
      const next = !state.isMock;
      localStorage.setItem(STORAGE_KEY, String(next));
      return { isMock: next };
    });
  },
}));
