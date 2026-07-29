interface ProgressBarProps {
  /** 0–100. */
  pct: number;
  className?: string;
}

/** Solid amber progress bar over a hairline-bordered track. No gradient.
 *  Uses compositor-friendly transform: scaleX rather than animating width. */
export function ProgressBar({ pct, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const ratio = clamped / 100;
  return (
    <div
      className={`progress-track ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}
