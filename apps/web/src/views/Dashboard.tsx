import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStreamsStore } from '@/store/streams';
import { useWalletStore } from '@/store/wallet';
import { StatCard } from '@/components/StatCard';
import { StreamCard } from '@/components/StreamCard';
import { EventRow } from '@/components/EventRow';
import { EmptyState } from '@/components/EmptyState';
import { EventMarquee } from '@/components/EventMarquee';
import { StatCardSkeleton, StreamCardSkeleton } from '@/components/Skeleton';
import { IconActivity, IconArrow, IconBolt, IconStreams, IconWallet } from '@/components/icons';
import { formatCompact, nextDueTs, timeAgo } from '@/lib/format';

type OwnershipScope = 'my' | 'incoming';

const SCOPE_LABELS: Record<OwnershipScope, string> = {
  my: 'My streams',
  incoming: 'Incoming',
};

/**
 * Landing view: hero + 4 KPI cards, active streams, and a live event feed.
 * Exclusively wallet-scoped — stats and stream cards show only the selected scope
 * (My streams / Incoming). When no wallet is connected the data sections are
 * replaced with a connect-wallet prompt.
 *
 * The "Simulate tick" button triggers pay_next on every due Active stream within
 * the current scope.
 */
export function Dashboard() {
  const publicKey = useWalletStore((s) => s.publicKey);
  const { schedules, events, loading, loaded, refresh, payNext } = useStreamsStore();
  const [scope, setScope] = useState<OwnershipScope>('my');

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  const scoped = useMemo(() => {
    if (!publicKey) return [];
    if (scope === 'my') return schedules.filter((s) => s.sender === publicKey);
    return schedules.filter((s) => s.recipient === publicKey);
  }, [schedules, scope, publicKey]);

  const active = useMemo(() => scoped.filter((s) => s.status === 'Active'), [scoped]);

  const stats = useMemo(() => {
    const totalLocked = scoped.reduce((sum, s) => sum + s.deposit, 0);
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
  }, [scoped, active]);

  /** Trigger pay_next on every due Active stream within the current scope, sequentially. */
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
          {publicKey ? (
            <>
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
            </>
          ) : (
            <p className="text-sm text-muted">
              <IconWallet className="mr-1.5 inline h-4 w-4 align-text-bottom" />
              Connect a wallet above to see your streams and stats.
            </p>
          )}
        </div>
      </section>

      {!publicKey ? (
        /* Disconnected state: no data shown, prompt to connect */
        <section className="rounded-md border border-line bg-surface2 p-8 text-center">
          <IconWallet className="mx-auto mb-3 h-8 w-8 text-faint" />
          <h2 className="font-display text-xl font-light text-ink">No wallet connected</h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted">
            Connect your Freighter or Lobstr wallet to view your streams, track
            incoming payments, and manage escrows — all from this dashboard.
          </p>
        </section>
      ) : (
        <>
          {/* Scope toggle — only when a wallet is connected */}
          <div className="mb-2 flex flex-wrap gap-6 border-b border-line">
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

          {/* Stats */}
          {loading && !loaded ? (
            <section className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </section>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
                <StatCard
                  label="Active streams"
                  value={String(stats.activeCount)}
                  hint={scope === 'my' ? 'outgoing' : 'incoming'}
                  icon={<IconStreams className="h-4 w-4" />}
                />
                <StatCard
                  label="Total locked"
                  value={formatCompact(stats.totalLocked)}
                  hint={
                    scope === 'my'
                      ? 'in your escrows'
                      : 'in escrows paying you'
                  }
                  icon={<IconWallet className="h-4 w-4" />}
                />
                <StatCard
                  label="Monthly outflow"
                  value={formatCompact(stats.monthlyOutflow)}
                  hint={
                    scope === 'my'
                      ? 'normalized ~30d'
                      : 'normalized incoming ~30d'
                  }
                  icon={<IconActivity className="h-4 w-4" />}
                />
                <StatCard
                  label="Next disbursement"
                  value={stats.nextDue ? timeAgo(stats.nextDue) : '—'}
                  hint={stats.activeCount ? 'soonest due' : 'no active streams'}
                  icon={<IconBolt className="h-4 w-4" />}
                />
              </section>
            </>
          )}

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
                  to={`/streams?scope=${scope}`}
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
                      title={
                        scope === 'my'
                          ? 'No active outgoing streams'
                          : 'No active incoming streams'
                      }
                      message={
                        scope === 'my'
                          ? 'Create your first recurring payment to get started.'
                          : 'Streams others send to you will appear here once they are funded and active.'
                      }
                      action={
                        scope === 'my' ? (
                          <Link to="/create" className="btn-primary">
                            New stream <IconArrow className="h-4 w-4" />
                          </Link>
                        ) : undefined
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
        </>
      )}
    </div>
  );
}
