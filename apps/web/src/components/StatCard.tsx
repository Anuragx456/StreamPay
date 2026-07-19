import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  /** Legacy prop — accepted but no longer used (single-accent system). */
  accent?: string;
}

/**
 * Compact KPI card. Editorial register: hairline surface, mono uppercase label,
 * the number is the hero (display face). No accent color on the value — the
 * numbers carry themselves; the icon sits quiet in muted ink.
 */
export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between">
        <span className="eyebrow text-faint">{label}</span>
        <span className="grid h-7 w-7 place-items-center text-faint">{icon}</span>
      </div>
      <div className="mt-4 font-display text-[2rem] font-light leading-none tracking-tight text-ink">
        {value}
      </div>
      {hint && <div className="mt-2 font-mono text-xs text-muted">{hint}</div>}
    </div>
  );
}
