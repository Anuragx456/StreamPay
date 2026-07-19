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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <span className="eyebrow text-faint">Event log</span>
          <h1 className="mt-3 font-display text-[clamp(1.875rem,4vw,2.5rem)] font-light leading-tight tracking-[-0.02em] text-ink">
            Activity
          </h1>
          <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted">
            On-chain events across every stream, newest first.
          </p>
        </div>
      </div>

      {/* Type filter — hairline segmented row, mono labels. */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`rounded-sm border px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] transition-colors ${
                active
                  ? 'border-lineStrong text-ink'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading && !loaded ? (
        <div className="divide-y divide-line overflow-hidden rounded-md border border-line">
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
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[0.65rem] uppercase tracking-[0.14em] text-faint">
                <th className="px-4 py-3 font-normal">Event</th>
                <th className="px-4 py-3 font-normal">Stream</th>
                <th className="px-4 py-3 font-normal">Amount</th>
                <th className="px-4 py-3 font-normal">Tx</th>
                <th className="px-4 py-3 text-right font-normal">When</th>
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
