interface ProgressBarProps {
  /** 0–100. */
  pct: number;
  className?: string;
}

/** Solid amber progress bar over a hairline-bordered track. No gradient. */
export function ProgressBar({ pct, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={`progress-track ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}
