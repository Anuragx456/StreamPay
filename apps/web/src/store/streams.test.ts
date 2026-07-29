import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreamEvent } from '../lib/types';

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getSnapshot: vi.fn(),
}));

vi.mock('../lib/contract', () => ({
  contract: {
    ...mocks,
    initSchedule: vi.fn(),
    deposit: vi.fn(),
    payNext: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  },
}));

import { mergeEvents, useStreamsStore } from './streams';
import { CONTRACT_ID } from '../lib/constants';

const event = (id: string, ts: number): StreamEvent => ({
  id,
  ts,
  type: 'payment',
  scheduleId: '1',
  txHash: id.padEnd(64, '0'),
});

beforeEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  localStorage.clear();
  mocks.getEvents.mockReset();
  mocks.getSnapshot.mockReset();
  useStreamsStore.setState({ events: [], schedules: [], loaded: true, syncError: null });
});

describe('mergeEvents', () => {
  it('deduplicates by event id and keeps newest first', () => {
    expect(mergeEvents([event('a', 1)], [event('a', 1), event('b', 2)]).map((e) => e.id)).toEqual([
      'b',
      'a',
    ]);
  });
});

describe('generation guard', () => {
  it('discards stale refresh responses after reset', async () => {
    const freshData = { schedules: [{ id: 'live-1', label: 'Live stream', sender: 'G', recipient: 'G', amount: 100, asset: 'USDC', cadenceSecs: 86400, totalCount: 12, paidCount: 0, lastPaidTs: 0, deposit: 1200, status: 'Active' as const, createdTs: 1000 }], events: [] };
    const staleData = { schedules: [], events: [] };

    // resolve with stale data first, then fresh
    mocks.getSnapshot
      .mockResolvedValueOnce(staleData)
      .mockResolvedValueOnce(freshData);

    // Start a first generation refresh (simulates mock-mode fetch)
    useStreamsStore.setState({ loaded: false, generation: 0 });
    const p1 = useStreamsStore.getState().refresh();

    // While the first request is in-flight, reset (like a mode switch)
    useStreamsStore.getState().reset();

    // Wait for both
    await p1;
    // After reset, a second refresh was triggered; let it settle.
    // The stale response from p1 should have been discarded.
    await vi.waitFor(() => {
      const state = useStreamsStore.getState();
      expect(state.generation).toBe(1);
      // If the stale response was discarded, schedules come from the fresh fetch
      expect(state.schedules).toEqual(freshData.schedules);
    });
  });

  it('increments generation on reset', () => {
    useStreamsStore.setState({ generation: 0 });
    useStreamsStore.getState().reset();
    expect(useStreamsStore.getState().generation).toBe(1);
    useStreamsStore.getState().reset();
    expect(useStreamsStore.getState().generation).toBe(2);
  });

  it('discards stale error responses after reset', async () => {
    mocks.getSnapshot
      .mockRejectedValueOnce(new Error('Stale error'))
      .mockResolvedValueOnce({ schedules: [], events: [] });

    useStreamsStore.setState({ loaded: false, generation: 0 });
    const p1 = useStreamsStore.getState().refresh();

    // Reset while in-flight
    useStreamsStore.getState().reset();

    await p1;
    await vi.waitFor(() => {
      const state = useStreamsStore.getState();
      // Stale error should have been discarded — no toast would fire
      expect(state.syncError).toBeNull();
      // Generation should have moved on
      expect(state.generation).toBe(1);
    });
  });
});

describe('reset', () => {
  it('clears schedules, events, cursor, and loaded flag', () => {
    const cursorKey = `streampay:event-cursor:${CONTRACT_ID || 'mock'}`;
    useStreamsStore.setState({
      schedules: [{ id: '1', label: 'x', sender: 'G', recipient: 'G', amount: 10, asset: 'XLM', cadenceSecs: 3600, totalCount: 3, paidCount: 0, lastPaidTs: 0, deposit: 30, status: 'Active', createdTs: 100 }],
      events: [{ id: 'e1', type: 'created', scheduleId: '1', txHash: '0'.repeat(64), ts: 100 }],
      loaded: true,
      generation: 0,
    });
    localStorage.setItem(cursorKey, 'some-cursor');

    useStreamsStore.getState().reset();

    const state = useStreamsStore.getState();
    expect(state.schedules).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.loaded).toBe(false);
    expect(localStorage.getItem(cursorKey)).toBeNull();
    expect(state.generation).toBe(1);
  });

  it('fetches fresh data after reset', async () => {
    const freshData = { schedules: [], events: [] };
    mocks.getSnapshot.mockResolvedValue(freshData);

    useStreamsStore.getState().reset();

    await vi.waitFor(() => {
      expect(mocks.getSnapshot).toHaveBeenCalled();
    });
  });
});

describe('event polling', () => {
  it('advances the cursor, deduplicates, and refreshes schedules for new events', async () => {
    useStreamsStore.setState({ events: [event('a', 1)] });
    mocks.getEvents.mockResolvedValue({ events: [event('a', 1), event('b', 2)], cursor: 'next' });
    mocks.getSnapshot.mockResolvedValue({ schedules: [], events: [] });

    await useStreamsStore.getState().pollEvents();

    expect(document.hidden).toBe(false);
    expect(mocks.getEvents).toHaveBeenCalledOnce();
    expect(localStorage.getItem(`streampay:event-cursor:${CONTRACT_ID || 'mock'}`)).toBe('next');
    expect(useStreamsStore.getState().events.map((e) => e.id)).toEqual(['b', 'a']);
    expect(mocks.getSnapshot).toHaveBeenCalledOnce();
    expect(useStreamsStore.getState().lastSync).not.toBeNull();
  });
});
