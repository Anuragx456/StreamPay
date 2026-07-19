interface ProgressBarProps {
  /** 0–100. */
  pct: number;
  /** Tailwind gradient/color class for the fill. */
  className?: string;
}

/** Animated progress bar. Width transitions when `pct` changes. */
export function ProgressBar({ pct, className = 'bg-brand-gradient' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${className}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
