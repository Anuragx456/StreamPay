import type { Schedule } from '@/lib/types';

/**
 * Stream status as a hairline-bordered mono pill: colored text + a tiny dot,
 * never a filled neon background. Color is carried by a CSS var so light/dark
 * swap for free (active = teal in light / amber in dark, paused = muted amber,
 * ended = faint).
 */
const PILL_VAR: Record<Schedule['status'], string> = {
  Active: 'var(--status-active)',
  Paused: 'var(--status-paused)',
  Ended: 'var(--status-ended)',
};

export function StatusPill({ status }: { status: Schedule['status'] }) {
  return (
    <span
      className="status-pill"
      style={{ ['--pill-color' as string]: PILL_VAR[status] }}
    >
      <span className="dot" aria-hidden="true" />
      {status}
    </span>
  );
}
