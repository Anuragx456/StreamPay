// Shimmering loading placeholders. The shimmer gradient is defined here and
// animated via the `shimmer` keyframe in tailwind.config.js.

interface SkeletonProps {
  className?: string;
}

/** A single shimmering block. Compose these to mock any layout. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.10)_37%,rgba(255,255,255,0.04)_63%)] bg-[length:200%_100%] ${className}`}
    />
  );
}

/** Skeleton shaped like a StatCard. */
export function StatCardSkeleton() {
  return (
    <div className="glass p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

/** Skeleton shaped like a StreamCard. */
export function StreamCardSkeleton() {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-2 w-full rounded-full" />
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
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="ml-auto h-4 w-32" />
    </div>
  );
}
