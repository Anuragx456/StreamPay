import { useToastStore, type ToastKind } from '@/store/toast';
import { IconCheck, IconClose, IconInfo } from './icons';
import type { ReactElement } from 'react';

const KIND_STYLES: Record<ToastKind, { ring: string; icon: ReactElement }> = {
  success: {
    ring: 'border-brand-lime/40 shadow-[0_0_30px_-12px_rgba(163,230,53,0.6)]',
    icon: <IconCheck className="h-4 w-4 text-brand-lime" />,
  },
  error: {
    ring: 'border-red-500/40 shadow-[0_0_30px_-12px_rgba(239,68,68,0.6)]',
    icon: <IconClose className="h-4 w-4 text-red-400" />,
  },
  info: {
    ring: 'border-brand-cyan/40 shadow-[0_0_30px_-12px_rgba(34,211,238,0.6)]',
    icon: <IconInfo className="h-4 w-4 text-brand-cyan" />,
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
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((t) => {
        const style = KIND_STYLES[t.kind];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`glass pointer-events-auto flex w-full items-start gap-3 border p-3 text-left animate-fade-in ${style.ring}`}
          >
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/5">
              {style.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-100">{t.title}</span>
              {t.detail && (
                <span className="mt-0.5 block break-words text-xs text-slate-400">{t.detail}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
