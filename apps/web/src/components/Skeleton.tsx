// Token-based loading placeholders. The quiet sweep is defined by the
// `.skeleton` class in index.css (respects prefers-reduced-motion).

interface SkeletonProps {
  className?: string;
}

/** A single sweeping block. Compose these to mock any layout. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

/** Skeleton shaped like a StatCard. */
export function StatCardSkeleton() {
  return (
    <div className="card p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

/** Skeleton shaped like a StreamCard. */
export function StreamCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16 rounded-pill" />
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-2 w-full rounded-pill" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

/** Skeleton for a table row (Activity view). */
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Skeleton className="h-5 w-16 rounded-pill" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="ml-auto h-4 w-32" />
    </div>
  );
}
