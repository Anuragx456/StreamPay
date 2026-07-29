import { create } from 'zustand';
import { contract } from '../lib/contract';
import { CONTRACT_ID } from '../lib/constants';
import { errorMessage } from '../lib/errors';
import type {
  CreateScheduleInput,
  Schedule,
  StreamEvent,
  TransactionFeedback,
  TransactionProgress,
  TransactionReceipt,
} from '../lib/types';
import { toast } from './toast';

const CURSOR_KEY = `streampay:event-cursor:${CONTRACT_ID || 'mock'}`;
const POLL_MS = 5_000;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let visibilityHandler: (() => void) | undefined;

export function mergeEvents(current: StreamEvent[], incoming: StreamEvent[]): StreamEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()].sort((a, b) => b.ts - a.ts);
}

interface StreamsState {
  schedules: Schedule[];
  events: StreamEvent[];
  loading: boolean;
  loaded: boolean;
  pending: Record<string, boolean>;
  transactions: Record<string, TransactionFeedback>;
  syncLoading: boolean;
  syncError: string | null;
  lastSync: number | null;
  /**
   * Monotonically-increasing counter incremented on every reset(). Each
   * refresh() call captures the generation at call time; when its response
   * arrives, it checks against the current generation. A stale response (from
   * a request started before the most recent reset) is discarded, preventing
   * out-of-order mock/live data from overwriting the correct state.
   */
  generation: number;

  refresh: () => Promise<void>;
  pollEvents: () => Promise<void>;
  startEventSync: () => void;
  stopEventSync: () => void;
  create: (input: CreateScheduleInput, sender: string) => Promise<string | null>;
  deposit: (id: string, amount: number) => Promise<void>;
  payNext: (id: string) => Promise<void>;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  reset: () => void;
}

type SetState = (fn: (state: StreamsState) => Partial<StreamsState>) => void;

function progress(set: SetState, key: string): TransactionProgress {
  return (state, hash) =>
    set((current) => ({
      transactions: { ...current.transactions, [key]: { state, hash } },
    }));
}

async function runAction(
  set: SetState,
  get: () => StreamsState,
  id: string,
  action: string,
  fn: (onProgress: TransactionProgress) => Promise<TransactionReceipt>,
  successMsg: string,
): Promise<void> {
  const key = `${id}:${action}`;
  set((state) => ({ pending: { ...state.pending, [id]: true } }));
  try {
    const receipt = await fn(progress(set, key));
    set((state) => ({
      transactions: {
        ...state.transactions,
        [key]: { state: 'success', hash: receipt.hash },
      },
    }));
    await get().refresh();
    toast.success(successMsg);
  } catch (error) {
    const message = errorMessage(error);
    set((state) => ({
      transactions: { ...state.transactions, [key]: { state: 'failed', message } },
    }));
    toast.error('Action failed', message);
  } finally {
    set((state) => {
      const pending = { ...state.pending };
      delete pending[id];
      return { pending };
    });
  }
}

export const useStreamsStore = create<StreamsState>((set, get) => ({
  schedules: [],
  events: [],
  loading: false,
  loaded: false,
  pending: {},
  transactions: {},
  syncLoading: false,
  syncError: null,
  lastSync: null,
  generation: 0,

  refresh: async () => {
    const gen = get().generation;
    set(() => ({ loading: true }));
    try {
      const snapshot = await contract.getSnapshot();
      // Discard stale responses from requests started before the most
      // recent reset()/mode switch.
      if (get().generation !== gen) return;
      set((state) => ({
        schedules: snapshot.schedules,
        events: mergeEvents(state.events, snapshot.events),
        loading: false,
        loaded: true,
      }));
    } catch (error) {
      // Only report errors for the current generation — stale requests
      // that fail (e.g. a disposed MockClient) are harmless.
      if (get().generation !== gen) return;
      const message = errorMessage(error);
      set(() => ({ loading: false, syncError: message }));
      toast.error('Failed to load streams', message);
    }
  },

  pollEvents: async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    set(() => ({ syncLoading: true }));
    try {
      const cursor = localStorage.getItem(CURSOR_KEY) || undefined;
      const page = await contract.getEvents(cursor);
      const known = new Set(get().events.map((event) => event.id));
      const hasNew = page.events.some((event) => !known.has(event.id));
      if (page.cursor) localStorage.setItem(CURSOR_KEY, page.cursor);
      set((state) => ({
        events: mergeEvents(state.events, page.events),
        syncLoading: false,
        syncError: null,
        lastSync: Date.now(),
      }));
      if (hasNew) await get().refresh();
    } catch (error) {
      set(() => ({ syncLoading: false, syncError: errorMessage(error) }));
    }
  },

  startEventSync: () => {
    if (pollTimer) return;
    void get().refresh().then(() => get().pollEvents());
    pollTimer = setInterval(() => void get().pollEvents(), POLL_MS);
    visibilityHandler = () => {
      if (!document.hidden) void get().pollEvents();
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  },

  stopEventSync: () => {
    if (pollTimer) clearInterval(pollTimer);
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    pollTimer = undefined;
    visibilityHandler = undefined;
  },

  create: async (input, sender) => {
    const key = 'create';
    try {
      const receipt = await contract.initSchedule(input, sender, progress(set, key));
      set((state) => ({
        transactions: {
          ...state.transactions,
          [key]: { state: 'success', hash: receipt.hash },
        },
      }));
      await get().refresh();
      toast.success('Stream created', `Schedule #${receipt.value} is now active`);
      return receipt.value;
    } catch (error) {
      const message = errorMessage(error);
      set((state) => ({
        transactions: { ...state.transactions, [key]: { state: 'failed', message } },
      }));
      toast.error('Create failed', message);
      return null;
    }
  },

  deposit: (id, amount) =>
    runAction(set, get, id, 'deposit', (onProgress) => contract.deposit(id, amount, onProgress), 'Top-up deposited'),
  payNext: (id) =>
    runAction(set, get, id, 'pay', (onProgress) => contract.payNext(id, onProgress), 'Payment disbursed'),
  pause: (id) =>
    runAction(set, get, id, 'pause', (onProgress) => contract.pause(id, onProgress), 'Stream paused'),
  resume: (id) =>
    runAction(set, get, id, 'resume', (onProgress) => contract.resume(id, onProgress), 'Stream resumed'),
  cancel: (id) =>
    runAction(set, get, id, 'cancel', (onProgress) => contract.cancel(id, onProgress), 'Stream cancelled, remainder refunded'),

  /**
   * Reset all cached state and reload from the active contract client. Called
   * when the user toggles mock/live mode to ensure stale data from the previous
   * mode is discarded.
   *
   * Increments generation so any in-flight refresh() from the old mode
   * discards its response when it eventually arrives.
   */
  reset: () => {
    localStorage.removeItem(CURSOR_KEY);
    set((state) => ({
      schedules: [],
      events: [],
      loading: false,
      loaded: false,
      pending: {},
      transactions: {},
      syncError: null,
      lastSync: null,
      generation: state.generation + 1,
    }));
    void get().refresh();
  },
}));
