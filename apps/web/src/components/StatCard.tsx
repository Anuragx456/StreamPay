import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  /** Tailwind text color class for the icon accent, e.g. "text-brand-cyan". */
  accent?: string;
}

/** Compact KPI card used in the dashboard stat row. */
export function StatCard({ label, value, hint, icon, accent = 'text-brand-cyan' }: StatCardProps) {
  return (
    <div className="glass glass-hover p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg bg-white/5 ${accent}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
