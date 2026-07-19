import { useEffect, type ReactNode } from 'react';
import { IconClose } from './icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional footer actions row. */
  footer?: ReactNode;
}

/**
 * Accessible modal with a blurred backdrop. Closes on Escape and backdrop click;
 * locks body scroll while open. Content animates in via `animate-fade-in`.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm"
      />
      {/* Panel */}
      <div className="glass relative z-10 w-full max-w-md p-5 animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <div className="text-sm text-slate-300">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
