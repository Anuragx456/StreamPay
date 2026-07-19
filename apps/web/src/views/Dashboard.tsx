import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStreamsStore } from '@/store/streams';
import { StatCard } from '@/components/StatCard';
import { StreamCard } from '@/components/StreamCard';
import { EventRow } from '@/components/EventRow';
import { EmptyState } from '@/components/EmptyState';
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
    <div className="space-y-6">
      {/* Hero */}
      <section className="glass relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-violet/20 blur-3xl" />
        <div className="relative">
          <span className="chip bg-white/5 text-slate-300">Soroban · {}</span>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
            Program money to <span className="gradient-text">stream itself</span>.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Lock funds once. StreamPay disburses a fixed amount on your cadence until the plan ends
            or you cancel — enforced on-chain, triggered by an off-chain watcher.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/create" className="btn-primary">
              <IconBolt className="h-4 w-4" /> New stream
            </Link>
            <button type="button" className="btn-ghost" onClick={simulateTick} disabled={loading}>
              <IconActivity className="h-4 w-4" /> Simulate tick
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading && !loaded ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Active streams"
              value={String(stats.activeCount)}
              hint={`${schedules.length} total`}
              icon={<IconStreams className="h-4 w-4" />}
              accent="text-brand-cyan"
            />
            <StatCard
              label="Total locked"
              value={formatCompact(stats.totalLocked)}
              hint="across all escrows"
              icon={<IconWallet className="h-4 w-4" />}
              accent="text-brand-violet"
            />
            <StatCard
              label="Monthly outflow"
              value={formatCompact(stats.monthlyOutflow)}
              hint="normalized ~30d"
              icon={<IconActivity className="h-4 w-4" />}
              accent="text-brand-lime"
            />
            <StatCard
              label="Next disbursement"
              value={stats.nextDue ? timeAgo(stats.nextDue) : '—'}
              hint={stats.activeCount ? 'soonest due' : 'no active streams'}
              icon={<IconBolt className="h-4 w-4" />}
              accent="text-brand-cyan"
            />
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active streams */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Active streams</h2>
            <Link to="/streams" className="flex items-center gap-1 text-sm text-brand-cyan hover:underline">
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
                      <IconBolt className="h-4 w-4" /> New stream
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        </section>

        {/* Live events */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">Live activity</h2>
          <div className="glass divide-y divide-white/5 overflow-hidden">
            {loaded && events.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No events yet.</div>
            ) : (
              events.slice(0, 8).map((e) => <EventRow key={e.id} event={e} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
