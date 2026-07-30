import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStreamsStore } from '@/store/streams';
import { useWalletStore } from '@/store/wallet';
import { StreamCard } from '@/components/StreamCard';
import { EmptyState } from '@/components/EmptyState';
import { StreamCardSkeleton } from '@/components/Skeleton';
import { IconArrow, IconStreams } from '@/components/icons';
import type { ScheduleStatus } from '@/lib/types';

type Filter = 'All' | ScheduleStatus;
type OwnershipScope = 'my' | 'incoming' | 'public';

const FILTERS: Filter[] = ['All', 'Active', 'Paused', 'Ended'];

const SCOPE_LABELS: Record<OwnershipScope, string> = {
  my: 'My streams',
  incoming: 'Incoming',
  public: 'Public network',
};

const SCOPE_DESCRIPTIONS: Record<OwnershipScope, string> = {
  my: 'Streams where you are the sender.',
  incoming: 'Streams where you are the recipient.',
  public: 'All streams on the network, regardless of ownership.',
};

/**
 * Full list of every schedule with ownership-scope and status filters.
 * Ownership-aware: "My streams" shows sender-owned schedules, "Incoming" shows
 * recipient schedules, and "Public network" shows everything. When no wallet is
 * connected the scope defaults to public.
 *
 * Accepts an optional `?scope=` query param (from Dashboard's "View all" link)
 * to pre-select the ownership scope on initial mount.
 *
 * Each scope uses the same StreamCard component, which itself gates owner-only
 * actions (cancel/pause/resume/top-up) behind the connected wallet's key.
 */
export function Streams() {
  const publicKey = useWalletStore((s) => s.publicKey);
  const [searchParams] = useSearchParams();
  const { schedules, loading, loaded, refresh } = useStreamsStore();
  const [filter, setFilter] = useState<Filter>('All');
  const [scope, setScope] = useState<OwnershipScope>(() => {
    // Honour ?scope= query param from Dashboard's "View all" link
    const fromUrl = searchParams.get('scope');
    if (fromUrl === 'my' || fromUrl === 'incoming') return fromUrl;
    return publicKey ? 'my' : 'public';
  });

  // Reset to public when wallet disconnects, my when wallet connects
  useEffect(() => {
    setScope((prev) => {
      if (!publicKey) return 'public';
      if (prev === 'public') return 'my';
      return prev;
    });
  }, [publicKey]);

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  const scoped = useMemo(() => {
    if (!publicKey || scope === 'public') return schedules;
    if (scope === 'my') return schedules.filter((s) => s.sender === publicKey);
    return schedules.filter((s) => s.recipient === publicKey);
  }, [schedules, scope, publicKey]);

  const counts = useMemo(() => {
    const by: Record<Filter, number> = { All: scoped.length, Active: 0, Paused: 0, Ended: 0 };
    for (const s of scoped) by[s.status] += 1;
    return by;
  }, [scoped]);

  const visible = useMemo(
    () => (filter === 'All' ? scoped : scoped.filter((s) => s.status === filter)),
    [scoped, filter],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-light tracking-[-0.02em] text-ink">
            Streams
          </h1>
          <p className="mt-2 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">
            {publicKey ? SCOPE_DESCRIPTIONS[scope] : 'Connect a wallet to see your streams.'}
          </p>
        </div>
        <Link to="/create" className="btn-primary">
          New stream <IconArrow className="h-4 w-4" />
        </Link>
      </div>

      {/* Ownership scope tabs */}
      {publicKey && (
        <div className="flex flex-wrap gap-6 border-b border-line">
          {(Object.keys(SCOPE_LABELS) as OwnershipScope[]).map((s) => {
            const isActive = scope === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`-mb-px flex min-h-11 items-center gap-1.5 border-b pb-2.5 text-sm transition-colors ${
                  isActive
                    ? 'border-[color:var(--active-nav)] font-medium text-[color:var(--active-nav)]'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {SCOPE_LABELS[s]}
              </button>
            );
          })}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-6 border-b border-line">
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`-mb-px flex min-h-11 items-center gap-1.5 border-b pb-2.5 text-sm transition-colors ${
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
              title={
                scope === 'public'
                  ? 'No streams on this network'
                  : scope === 'my'
                    ? 'No outgoing streams'
                    : 'No incoming streams'
              }
              message={
                scope === 'my'
                  ? 'Create your first recurring payment to get started.'
                  : scope === 'incoming'
                    ? 'Streams others send to you will appear here.'
                    : 'Try creating a new stream to see it here.'
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
