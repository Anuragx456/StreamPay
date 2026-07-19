import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStreamsStore } from '@/store/streams';
import { StreamCard } from '@/components/StreamCard';
import { EmptyState } from '@/components/EmptyState';
import { StreamCardSkeleton } from '@/components/Skeleton';
import { IconBolt, IconStreams } from '@/components/icons';
import type { ScheduleStatus } from '@/lib/types';

type Filter = 'All' | ScheduleStatus;

const FILTERS: Filter[] = ['All', 'Active', 'Paused', 'Ended'];

/**
 * Full list of every schedule with a status filter. Reuses the same StreamCard
 * as the dashboard, so all mutating actions (pay/top-up/pause/cancel) work here
 * too. Counts in the filter chips reflect the current snapshot.
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Streams</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every recurring payment you manage, across all statuses.
          </p>
        </div>
        <Link to="/create" className="btn-primary">
          <IconBolt className="h-4 w-4" /> New stream
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`chip transition-colors ${
              filter === f
                ? 'bg-white/15 text-slate-100'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f}
            <span className="text-slate-500">· {counts[f]}</span>
          </button>
        ))}
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
                  <IconBolt className="h-4 w-4" /> New stream
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
