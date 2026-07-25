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
