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
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-md border border-line bg-surface2 text-accent2">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
