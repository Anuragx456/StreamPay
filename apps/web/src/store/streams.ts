// Streams store: the single source of truth for schedules + events in the UI.
// All mutations go through lib/contract.ts (mock or real) and then refresh the
// snapshot, so the store stays in lockstep with the backing data source.

import { create } from 'zustand';
import { contract } from '../lib/contract';
import type { CreateScheduleInput, Schedule, StreamEvent } from '../lib/types';
import { toast } from './toast';

interface StreamsState {
  schedules: Schedule[];
  events: StreamEvent[];
  loading: boolean;
  loaded: boolean;
  /** Per-schedule in-flight action flag, for button spinners. */
  pending: Record<string, boolean>;

  refresh: () => Promise<void>;
  create: (input: CreateScheduleInput, sender: string) => Promise<string | null>;
  deposit: (id: string, amount: number) => Promise<void>;
  payNext: (id: string) => Promise<void>;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}

/** Wrap a mutating call: set pending, run, refresh, toast on error. */
async function runAction(
  set: (fn: (s: StreamsState) => Partial<StreamsState>) => void,
  get: () => StreamsState,
  id: string,
  fn: () => Promise<void>,
  successMsg: string,
): Promise<void> {
  set((s) => ({ pending: { ...s.pending, [id]: true } }));
  try {
    await fn();
    await get().refresh();
    toast.success(successMsg);
  } catch (err) {
    toast.error('Action failed', err instanceof Error ? err.message : String(err));
  } finally {
    set((s) => {
      const pending = { ...s.pending };
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

  refresh: async () => {
    set(() => ({ loading: true }));
    try {
      const snap = await contract.getSnapshot();
      set(() => ({
        schedules: snap.schedules,
        events: snap.events,
        loading: false,
        loaded: true,
      }));
    } catch (err) {
      set(() => ({ loading: false }));
      toast.error('Failed to load streams', err instanceof Error ? err.message : String(err));
    }
  },

  create: async (input, sender) => {
    try {
      const id = await contract.initSchedule(input, sender);
      await get().refresh();
      toast.success('Stream created', `Schedule #${id} is now active`);
      return id;
    } catch (err) {
      toast.error('Create failed', err instanceof Error ? err.message : String(err));
      return null;
    }
  },

  deposit: (id, amount) =>
    runAction(set, get, id, () => contract.deposit(id, amount), 'Top-up deposited'),
  payNext: (id) =>
    runAction(set, get, id, () => contract.payNext(id), 'Payment disbursed'),
  pause: (id) => runAction(set, get, id, () => contract.pause(id), 'Stream paused'),
  resume: (id) => runAction(set, get, id, () => contract.resume(id), 'Stream resumed'),
  cancel: (id) =>
    runAction(set, get, id, () => contract.cancel(id), 'Stream cancelled, remainder refunded'),
}));
