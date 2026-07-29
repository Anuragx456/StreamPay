// Runtime mock-mode state. Mock mode auto-enables when no wallet is connected
// and auto-disables when a wallet connects — there is no manual toggle.
// `hasContractId` reflects whether VITE_CONTRACT_ID was set at build time;
// when it is empty, the app always stays in mock mode.

import { create } from 'zustand';
import { CONTRACT_ID } from '../lib/constants';

interface MockModeState {
  /** Whether the app should use the in-memory mock client. */
  isMock: boolean;
  /** Whether a real contract id was configured at build time. */
  hasContractId: boolean;
  /** Programmatically enable/disable mock mode. */
  setIsMock: (value: boolean) => void;
}

export const useMockModeStore = create<MockModeState>((set) => ({
  isMock: true,
  hasContractId: CONTRACT_ID.trim() !== '',
  setIsMock: (value) => set({ isMock: value }),
}));
