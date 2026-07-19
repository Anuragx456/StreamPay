import { useToastStore, type ToastKind } from '@/store/toast';
import { IconCheck, IconClose, IconInfo } from './icons';
import type { ReactElement } from 'react';

/**
 * Per-kind marker: a small dot colored via a CSS var + a mono uppercase label.
 * No filled backgrounds, no glow, no side-stripe — the editorial system marks
 * a toast by a quiet dot + label, not a colored panel.
 */
const KIND_META: Record<ToastKind, { color: string; label: string; icon: ReactElement }> = {
  success: {
    color: 'var(--accent-2)',
    label: 'Done',
    icon: <IconCheck className="h-3.5 w-3.5" />,
  },
  error: {
    color: 'var(--danger)',
    label: 'Error',
    icon: <IconClose className="h-3.5 w-3.5" />,
  },
  info: {
    color: 'var(--accent)',
    label: 'Info',
    icon: <IconInfo className="h-3.5 w-3.5" />,
  },
};

/**
 * Fixed toast stack (bottom-right). Each toast animates in via `animate-fade-in`
 * and auto-dismisses from the store after 4s; clicking dismisses early.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      style={{ zIndex: 'var(--z-toast)' }}
      className="pointer-events-none fixed bottom-4 right-4 flex w-[min(92vw,22rem)] flex-col gap-2"
    >
      {toasts.map((t) => {
        const meta = KIND_META[t.kind];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className="card pointer-events-auto flex w-full items-start gap-3 p-3 text-left animate-fade-in"
          >
            <span
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-pill"
              style={{ background: meta.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span
                  className="eyebrow text-[0.6rem]"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="text-sm font-semibold text-ink">{t.title}</span>
              </span>
              {t.detail && (
                <span className="mt-0.5 block break-words text-xs text-muted">{t.detail}</span>
              )}
            </span>
            <span className="mt-0.5 shrink-0 text-faint" style={{ color: meta.color }} aria-hidden="true">
              {meta.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
