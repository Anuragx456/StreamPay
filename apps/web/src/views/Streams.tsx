import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStreamsStore } from '@/store/streams';
import { StreamCard } from '@/components/StreamCard';
import { EmptyState } from '@/components/EmptyState';
import { StreamCardSkeleton } from '@/components/Skeleton';
import { IconArrow, IconStreams } from '@/components/icons';
import type { ScheduleStatus } from '@/lib/types';

type Filter = 'All' | ScheduleStatus;

const FILTERS: Filter[] = ['All', 'Active', 'Paused', 'Ended'];

/**
 * Full list of every schedule with a status filter. Reuses the same StreamCard
 * as the dashboard, so all mutating actions (pay/top-up/pause/cancel) work here
 * too. Counts in the filter tabs reflect the current snapshot.
 */
export function Streams() {
  const { schedules, loading, loaded, refresh } = useStreamsStore();
  const [filter, setFilter] = useState<Filter>('All');

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  const counts = useMemo(() => {
    const by: Record<Filter, number> = { All: schedules.length, Active: 0, Paused: 0, Ended: 0 };
    for (const s of schedules) by[s.status] += 1;
    return by;
  }, [schedules]);

  const visible = useMemo(
    () => (filter === 'All' ? schedules : schedules.filter((s) => s.status === filter)),
    [schedules, filter],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-light tracking-[-0.02em] text-ink">
            Streams
          </h1>
          <p className="mt-2 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">
            Every recurring payment you manage, across all statuses.
          </p>
        </div>
        <Link to="/create" className="btn-primary">
          New stream <IconArrow className="h-4 w-4" />
        </Link>
      </div>

      {/* Filter tabs: hairline underline on the active one, no filled box. */}
      <div className="flex flex-wrap gap-6 border-b border-line">
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`-mb-px flex items-center gap-1.5 border-b pb-2.5 text-sm transition-colors ${
                isActive
                  ? 'border-[color:var(--active-nav)] font-medium text-[color:var(--active-nav)]'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {f}
              <span className="font-mono text-xs text-faint">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !loaded ? (
          Array.from({ length: 3 }).map((_, i) => <StreamCardSkeleton key={i} />)
        ) : visible.length ? (
          visible.map((s) => <StreamCard key={s.id} schedule={s} />)
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              icon={<IconStreams className="h-6 w-6" />}
              title={filter === 'All' ? 'No streams yet' : `No ${filter.toLowerCase()} streams`}
              message={
                filter === 'All'
                  ? 'Create your first recurring payment to get started.'
                  : 'Try a different filter, or create a new stream.'
              }
              action={
                <Link to="/create" className="btn-primary">
                  New stream <IconArrow className="h-4 w-4" />
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
