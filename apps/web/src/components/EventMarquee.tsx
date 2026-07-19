import type { CSSProperties } from 'react';
import type { EventType, StreamEvent } from '@/lib/types';
import { formatAmount, timeAgo } from '@/lib/format';

// Same token-driven color map as EventRow — no neon, swaps with the theme.
const TYPE_META: Record<EventType, { label: string; color: string }> = {
  created: { label: 'Created', color: 'var(--text-muted)' },
  payment: { label: 'Payment', color: 'var(--accent-2)' },
  deposit: { label: 'Deposit', color: 'var(--accent)' },
  cancel: { label: 'Cancel', color: 'var(--danger)' },
  pause: { label: 'Pause', color: 'var(--status-paused)' },
  resume: { label: 'Resume', color: 'var(--accent-2)' },
};

function Ticket({ event }: { event: StreamEvent }) {
  const meta = TYPE_META[event.type];
  const dotVar = { '--dot': meta.color } as CSSProperties;
  return (
    <div className="flex w-64 shrink-0 items-center gap-3 border-r border-line px-5 py-3">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-pill"
        style={{ ...dotVar, background: 'var(--dot)' }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
          {meta.label} · #{event.scheduleId}
        </div>
        <div className="mt-0.5 truncate font-mono text-sm text-ink">
          {event.amount != null ? formatAmount(event.amount, event.asset) : '—'}
        </div>
      </div>
      <span className="shrink-0 font-mono text-[0.65rem] text-faint">{timeAgo(event.ts)}</span>
    </div>
  );
}

/**
 * Infinite horizontal ticker of recent disbursement events. The track is
 * duplicated and translated -50% so the loop is seamless; hovering pauses it
 * (`.marquee-track` in index.css), and `prefers-reduced-motion` stops it dead.
 * Edges fade via a mask so tickets enter/exit softly.
 */
export function EventMarquee({ events }: { events: StreamEvent[] }) {
  // A short, stable slice keeps the loop tight; duplicated for the seam.
  const row = events.slice(0, 10);
  if (row.length === 0) return null;
  const loop = [...row, ...row];

  return (
    <div
      className="marquee-track overflow-hidden rounded-md border border-line"
      style={{
        maskImage:
          'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
        WebkitMaskImage:
          'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
      }}
    >
      <div className="marquee" aria-hidden="true">
        {loop.map((e, i) => (
          <Ticket key={`${e.id}-${i}`} event={e} />
        ))}
      </div>
    </div>
  );
}
