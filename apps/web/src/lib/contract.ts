// Single entry point the UI uses for all contract interactions. In MOCK MODE
// (no VITE_CONTRACT_ID) it delegates to the in-memory mockClient. When a
// contract id IS set, it delegates to the real Soroban client, which signs
// mutating calls with the connected wallet. Views never change between modes —
// keeping this seam narrow is what makes the app demoable standalone.

import { IS_MOCK } from './constants';
import { mockClient, type StreamSnapshot } from './mockClient';
import type { CreateScheduleInput } from './types';

export interface ContractClient {
  getSnapshot(): Promise<StreamSnapshot>;
  initSchedule(input: CreateScheduleInput, sender: string): Promise<string>;
  deposit(id: string, amount: number): Promise<void>;
  payNext(id: string): Promise<void>;
  pause(id: string): Promise<void>;
  resume(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}

/**
 * Lazily-constructed real client. We build it on first use rather than at module
 * load so that (a) the mock path never imports the stellar-sdk client, and (b)
 * we can read the wallet's current key + signer from the store without a static
 * import cycle (wallet store -> contract -> wallet store).
 */
let realClient: ContractClient | null = null;

async function getClient(): Promise<ContractClient> {
  if (IS_MOCK) return mockClient;
  if (realClient) return realClient;

  // Dynamic imports: pulled in only in live mode.
  const [{ makeSorobanClient }, { useWalletStore }] = await Promise.all([
    import('./sorobanClient'),
    import('../store/wallet'),
  ]);

  realClient = makeSorobanClient(
    () => useWalletStore.getState().publicKey,
    (xdr: string) => useWalletStore.getState().signXdr(xdr),
  );
  return realClient;
}

/**
 * Facade that resolves the active client per call. Async-forwards every method
 * so the store's call sites (`contract.payNext(id)`) are unchanged across modes.
 */
export const contract: ContractClient = {
  getSnapshot: async () => (await getClient()).getSnapshot(),
  initSchedule: async (input, sender) => (await getClient()).initSchedule(input, sender),
  deposit: async (id, amount) => (await getClient()).deposit(id, amount),
  payNext: async (id) => (await getClient()).payNext(id),
  pause: async (id) => (await getClient()).pause(id),
  resume: async (id) => (await getClient()).resume(id),
  cancel: async (id) => (await getClient()).cancel(id),
};

export { IS_MOCK };
