import { useEffect, useMemo, useState } from 'react';
import { useStreamsStore } from '@/store/streams';
import { EventRow } from '@/components/EventRow';
import { EmptyState } from '@/components/EmptyState';
import { RowSkeleton } from '@/components/Skeleton';
import { IconActivity } from '@/components/icons';
import type { EventType } from '@/lib/types';

/** Event-type filters offered above the table. `all` shows everything. */
const FILTERS: { key: EventType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'payment', label: 'Payments' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'created', label: 'Created' },
  { key: 'pause', label: 'Pauses' },
  { key: 'resume', label: 'Resumes' },
  { key: 'cancel', label: 'Cancels' },
];

/**
 * Full activity log: every stream event, newest first, filterable by type.
 * Events come from the same store snapshot the dashboard uses, so triggering a
 * pay_next / top-up / cancel anywhere shows up here immediately after refresh.
 */
export function Activity() {
  const { events, loading, loaded, refresh } = useStreamsStore();
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  const sorted = useMemo(() => [...events].sort((a, b) => b.ts - a.ts), [events]);
  const shown = useMemo(
    () => (filter === 'all' ? sorted : sorted.filter((e) => e.type === filter)),
    [sorted, filter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Activity</h1>
          <p className="mt-1 text-sm text-slate-400">
            On-chain events across every stream, newest first.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`chip transition-colors ${
                filter === f.key
                  ? 'bg-brand-cyan/15 text-brand-cyan'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !loaded ? (
        <div className="glass divide-y divide-white/5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<IconActivity className="h-6 w-6" />}
          title="No activity"
          message={
            filter === 'all'
              ? 'Events appear here as streams are created and paid.'
              : 'No events of this type yet. Try another filter.'
          }
        />
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Stream</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Tx</th>
                <th className="px-4 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
