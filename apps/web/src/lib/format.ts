// Pure formatting helpers. Kept side-effect free so they're trivially unit
// testable (see format.test.ts).

import type { Cadence } from './types';

/** Truncate a Stellar public key / contract id: GABC…WXYZ. */
export function truncateKey(key: string, lead = 4, tail = 4): string {
  if (!key) return '';
  if (key.length <= lead + tail + 1) return key;
  return `${key.slice(0, lead)}…${key.slice(-tail)}`;
}

/** Format a number as an asset amount with thousands separators. */
export function formatAmount(amount: number, asset = ''): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const s = n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
  return asset ? `${s} ${asset}` : s;
}

/** Compact currency-ish display for stat cards: 12.5K, 3.2M. */
export function formatCompact(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

/** Relative time from a unix-seconds timestamp: "3m ago", "in 2d". */
export function timeAgo(ts: number, now = Date.now()): string {
  const deltaSecs = Math.round(ts - now / 1000);
  const abs = Math.abs(deltaSecs);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
    [Infinity, 'year'],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let divisor = 1;
  let prevLimit = 1;
  for (const [limit, unit] of units) {
    if (abs < limit) {
      return rtf.format(Math.round(deltaSecs / prevLimit), unit);
    }
    divisor = limit;
    prevLimit = limit === 60 ? 1 : divisor;
  }
  return rtf.format(Math.round(deltaSecs / 31557600), 'year');
}

/** Absolute date/time for tables. */
export function formatDate(ts: number): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Cadence in seconds -> nearest friendly label. */
export function cadenceLabel(secs: number): string {
  const known: Cadence[] = [
    { label: 'Every minute', secs: 60 },
    { label: 'Hourly', secs: 3600 },
    { label: 'Daily', secs: 86400 },
    { label: 'Weekly', secs: 604800 },
    { label: 'Bi-weekly', secs: 1209600 },
    { label: 'Monthly', secs: 2629800 },
    { label: 'Quarterly', secs: 7889400 },
  ];
  const match = known.find((c) => c.secs === secs);
  if (match) return match.label;
  const days = Math.round(secs / 86400);
  return days >= 1 ? `Every ${days}d` : `Every ${secs}s`;
}

/** Next disbursement timestamp for a schedule, or null if none pending. */
export function nextDueTs(lastPaidTs: number, cadenceSecs: number, createdTs: number): number {
  const base = lastPaidTs > 0 ? lastPaidTs : createdTs;
  return base + cadenceSecs;
}

/** Percentage 0–100 of installments paid. */
export function progressPct(paidCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(100, Math.round((paidCount / totalCount) * 100));
}
