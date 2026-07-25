// Single entry point the UI uses for all contract interactions. In MOCK MODE
// (no VITE_CONTRACT_ID) it delegates to the in-memory mockClient. When a
// contract id IS set, it delegates to the real Soroban client, which signs
// mutating calls with the connected wallet. Views never change between modes —
// keeping this seam narrow is what makes the app demoable standalone.

import { IS_MOCK } from './constants';
import { mockClient, type StreamSnapshot } from './mockClient';
import type {
  CreateScheduleInput,
  EventPage,
  TransactionProgress,
  TransactionReceipt,
} from './types';

export interface ContractClient {
  getSnapshot(): Promise<StreamSnapshot>;
  getEvents(cursor?: string): Promise<EventPage>;
  initSchedule(
    input: CreateScheduleInput,
    sender: string,
    progress?: TransactionProgress,
  ): Promise<TransactionReceipt<string>>;
  deposit(id: string, amount: number, progress?: TransactionProgress): Promise<TransactionReceipt>;
  payNext(id: string, progress?: TransactionProgress): Promise<TransactionReceipt>;
  pause(id: string, progress?: TransactionProgress): Promise<TransactionReceipt>;
  resume(id: string, progress?: TransactionProgress): Promise<TransactionReceipt>;
  cancel(id: string, progress?: TransactionProgress): Promise<TransactionReceipt>;
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
  getEvents: async (cursor) => (await getClient()).getEvents(cursor),
  initSchedule: async (input, sender, progress) =>
    (await getClient()).initSchedule(input, sender, progress),
  deposit: async (id, amount, progress) => (await getClient()).deposit(id, amount, progress),
  payNext: async (id, progress) => (await getClient()).payNext(id, progress),
  pause: async (id, progress) => (await getClient()).pause(id, progress),
  resume: async (id, progress) => (await getClient()).resume(id, progress),
  cancel: async (id, progress) => (await getClient()).cancel(id, progress),
};

export { IS_MOCK };
