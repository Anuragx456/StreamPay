import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStreamsStore } from '@/store/streams';
import { StatCard } from '@/components/StatCard';
import { StreamCard } from '@/components/StreamCard';
import { EventRow } from '@/components/EventRow';
import { EmptyState } from '@/components/EmptyState';
import { EventMarquee } from '@/components/EventMarquee';
import { StatCardSkeleton, StreamCardSkeleton } from '@/components/Skeleton';
import { IconActivity, IconArrow, IconBolt, IconStreams, IconWallet } from '@/components/icons';
import { formatCompact, nextDueTs, timeAgo } from '@/lib/format';

/**
 * Landing view: hero + 4 KPI cards, active streams, and a live event feed.
 * The "Simulate tick" button walks every due Active stream and triggers
 * pay_next() — the same call the off-chain watcher makes on a schedule.
 */
export function Dashboard() {
  const { schedules, events, loading, loaded, refresh, payNext } = useStreamsStore();

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  const active = useMemo(() => schedules.filter((s) => s.status === 'Active'), [schedules]);

  const stats = useMemo(() => {
    const totalLocked = schedules.reduce((sum, s) => sum + s.deposit, 0);
    // Approximate monthly outflow: normalize each active stream's amount to ~30d.
    const monthlyOutflow = active.reduce(
      (sum, s) => sum + (s.amount * 2629800) / s.cadenceSecs,
      0,
    );
    const nextDue = active
      .map((s) => nextDueTs(s.lastPaidTs, s.cadenceSecs, s.createdTs))
      .sort((a, b) => a - b)[0];
    return {
      activeCount: active.length,
      totalLocked,
      monthlyOutflow,
      nextDue,
    };
  }, [schedules, active]);

  /** Trigger pay_next on every due Active stream, sequentially. */
  const simulateTick = async () => {
    const now = Math.floor(Date.now() / 1000);
    const due = active.filter(
      (s) =>
        s.deposit >= s.amount &&
        s.paidCount < s.totalCount &&
        nextDueTs(s.lastPaidTs, s.cadenceSecs, s.createdTs) <= now,
    );
    for (const s of due) await payNext(s.id);
  };

  return (
    <div className="space-y-10">
      {/* Hero — editorial: oversized thin headline, no glow, no gradient. */}
      <section className="border-b border-line pb-10 pt-2">
        <span className="eyebrow text-faint">Soroban · Recurring payments</span>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.25rem,5.5vw,3.75rem)] font-light leading-[1.04] tracking-[-0.02em] text-ink">
          Program money to stream itself.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted">
          Lock funds once. StreamPay disburses a fixed amount on your cadence until the plan ends
          or you cancel — enforced on-chain, triggered by an off-chain watcher.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link to="/create" className="btn-primary">
            New stream <IconArrow className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-40"
            onClick={simulateTick}
            disabled={loading}
          >
            <IconActivity className="mr-1.5 inline h-4 w-4 align-text-bottom" /> Simulate watcher tick
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
        {loading && !loaded ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Active streams"
              value={String(stats.activeCount)}
              hint={`${schedules.length} total`}
              icon={<IconStreams className="h-4 w-4" />}
            />
            <StatCard
              label="Total locked"
              value={formatCompact(stats.totalLocked)}
              hint="across all escrows"
              icon={<IconWallet className="h-4 w-4" />}
            />
            <StatCard
              label="Monthly outflow"
              value={formatCompact(stats.monthlyOutflow)}
              hint="normalized ~30d"
              icon={<IconActivity className="h-4 w-4" />}
            />
            <StatCard
              label="Next disbursement"
              value={stats.nextDue ? timeAgo(stats.nextDue) : '—'}
              hint={stats.activeCount ? 'soonest due' : 'no active streams'}
              icon={<IconBolt className="h-4 w-4" />}
            />
          </>
        )}
      </section>

      {/* Live events marquee — infinite scroll of the most recent disbursements. */}
      {loaded && events.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-accent2" />
            <h2 className="eyebrow text-muted">Live activity</h2>
          </div>
          <EventMarquee events={events} />
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Active streams */}
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-display text-xl font-light tracking-tight text-ink">Active streams</h2>
            <Link
              to="/streams"
              className="flex items-center gap-1 text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              View all <IconArrow className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {loading && !loaded ? (
              Array.from({ length: 2 }).map((_, i) => <StreamCardSkeleton key={i} />)
            ) : active.length ? (
              active.slice(0, 4).map((s) => <StreamCard key={s.id} schedule={s} />)
            ) : (
              <div className="sm:col-span-2">
                <EmptyState
                  icon={<IconStreams className="h-6 w-6" />}
                  title="No active streams"
                  message="Create your first recurring payment to see it here."
                  action={
                    <Link to="/create" className="btn-primary">
                      New stream <IconArrow className="h-4 w-4" />
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        </section>

        {/* Recent activity list */}
        <section>
          <h2 className="mb-4 border-b border-line pb-3 font-display text-xl font-light tracking-tight text-ink">
            Recent
          </h2>
          <div className="overflow-hidden rounded-md border border-line">
            {loaded && events.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs uppercase tracking-widest text-faint">
                No events yet
              </div>
            ) : (
              <div className="divide-y divide-line px-4">
                {events.slice(0, 8).map((e) => (
                  <EventRow key={e.id} event={e} compact />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
