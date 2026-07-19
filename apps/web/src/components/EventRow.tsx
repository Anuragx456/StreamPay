import type { EventType, StreamEvent } from '@/lib/types';
import { formatAmount, formatDate, truncateKey } from '@/lib/format';

interface EventRowProps {
  event: StreamEvent;
  /** When true, renders as a compact feed line (dashboard) instead of a table row. */
  compact?: boolean;
}

const TYPE_META: Record<EventType, { label: string; dot: string; text: string }> = {
  created: { label: 'Created', dot: 'bg-brand-cyan', text: 'text-brand-cyan' },
  payment: { label: 'Payment', dot: 'bg-brand-lime', text: 'text-brand-lime' },
  deposit: { label: 'Deposit', dot: 'bg-brand-violet', text: 'text-brand-violet' },
  cancel: { label: 'Cancel', dot: 'bg-red-400', text: 'text-red-300' },
  pause: { label: 'Pause', dot: 'bg-amber-400', text: 'text-amber-300' },
  resume: { label: 'Resume', dot: 'bg-emerald-400', text: 'text-emerald-300' },
};

/** Short explorer link for a tx hash (testnet). Falls back to plain text in mock. */
function txHref(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function EventRow({ event, compact = false }: EventRowProps) {
  const meta = TYPE_META[event.type];
  const amount = event.amount != null ? formatAmount(event.amount, event.asset) : '—';

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 animate-fade-in">
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
        <span className={`text-sm font-medium ${meta.text}`}>{meta.label}</span>
        <span className="text-sm text-slate-400">#{event.scheduleId}</span>
        {event.amount != null && (
          <span className="ml-auto font-mono text-sm text-slate-200">{amount}</span>
        )}
        <span className={`text-xs text-slate-500 ${event.amount != null ? '' : 'ml-auto'}`}>
          {formatDate(event.ts)}
        </span>
      </div>
    );
  }

  return (
    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className={`text-sm font-medium ${meta.text}`}>{meta.label}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-300">#{event.scheduleId}</td>
      <td className="px-4 py-3 font-mono text-sm text-slate-200">{amount}</td>
      <td className="px-4 py-3">
        <a
          href={txHref(event.txHash)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-brand-cyan hover:underline"
          title={event.txHash}
        >
          {truncateKey(event.txHash, 6, 6)}
        </a>
      </td>
      <td className="px-4 py-3 text-right text-xs text-slate-500">{formatDate(event.ts)}</td>
    </tr>
  );
}
