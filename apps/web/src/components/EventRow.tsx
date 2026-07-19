import type { CSSProperties } from 'react';
import type { EventType, StreamEvent } from '@/lib/types';
import { formatAmount, formatDate, truncateKey } from '@/lib/format';

interface EventRowProps {
  event: StreamEvent;
  /** When true, renders as a compact feed line (dashboard) instead of a table row. */
  compact?: boolean;
}

// Event labels + a single token-driven color each (set via --dot on the row).
// No neon; every color resolves to a theme token so it swaps with the mode.
const TYPE_META: Record<EventType, { label: string; color: string }> = {
  created: { label: 'Created', color: 'var(--text-muted)' },
  payment: { label: 'Payment', color: 'var(--accent-2)' },
  deposit: { label: 'Deposit', color: 'var(--accent)' },
  cancel: { label: 'Cancel', color: 'var(--danger)' },
  pause: { label: 'Pause', color: 'var(--status-paused)' },
  resume: { label: 'Resume', color: 'var(--accent-2)' },
};

/** Short explorer link for a tx hash (testnet). Falls back to plain text in mock. */
function txHref(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function EventRow({ event, compact = false }: EventRowProps) {
  const meta = TYPE_META[event.type];
  const amount = event.amount != null ? formatAmount(event.amount, event.asset) : '—';
  const dotVar = { '--dot': meta.color } as CSSProperties;

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2.5 animate-fade-in">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-pill"
          style={{ ...dotVar, background: 'var(--dot)' }}
        />
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted">
          {meta.label}
        </span>
        <span className="text-sm text-faint">#{event.scheduleId}</span>
        {event.amount != null && (
          <span className="ml-auto font-mono text-sm text-ink">{amount}</span>
        )}
        <span className={`font-mono text-xs text-faint ${event.amount != null ? '' : 'ml-auto'}`}>
          {formatDate(event.ts)}
        </span>
      </div>
    );
  }

  return (
    <tr className="border-b border-line transition-colors hover:bg-surface2">
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-pill"
            style={{ ...dotVar, background: 'var(--dot)' }}
          />
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted">
            {meta.label}
          </span>
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted">#{event.scheduleId}</td>
      <td className="px-4 py-3 font-mono text-sm text-ink">{amount}</td>
      <td className="px-4 py-3">
        <a
          href={txHref(event.txHash)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-accent2 hover:underline"
          title={event.txHash}
        >
          {truncateKey(event.txHash, 6, 6)}
        </a>
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-faint">{formatDate(event.ts)}</td>
    </tr>
  );
}
