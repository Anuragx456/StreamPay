import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

/** Consistent empty-state panel used when a list/table has no rows. */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="glass flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-brand-cyan">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
