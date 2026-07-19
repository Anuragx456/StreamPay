import type { ReactNode } from 'react';

interface BrowserMockupProps {
  /** URL shown in the address pill. */
  url?: string;
  children: ReactNode;
}

/**
 * Brand-register showcase frame: a mac-style window (three dots + a mono URL
 * pill) wrapping arbitrary content. This is the ONLY element permitted the big
 * --shadow-mockup; everything else in the system uses hairline borders.
 */
export function BrowserMockup({ url = 'streampay.app', children }: BrowserMockupProps) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface shadow-mockup">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-pill border border-lineStrong" />
          <span className="h-2.5 w-2.5 rounded-pill border border-lineStrong" />
          <span className="h-2.5 w-2.5 rounded-pill border border-lineStrong" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-pill border border-line px-3 py-1">
          <span className="h-1 w-1 rounded-pill bg-accent2" aria-hidden="true" />
          <span className="font-mono text-[0.7rem] text-muted">{url}</span>
        </div>
        <div className="w-10" aria-hidden="true" />
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
