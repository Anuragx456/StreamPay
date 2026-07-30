import { useEffect, type ReactNode } from 'react';
import { IconClose } from './icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional footer actions row. */
  footer?: ReactNode;
  /**
   * When true, Escape key and backdrop click are ignored and the close (X)
   * button is hidden. Use for async operations that shouldn't be interrupted.
   */
  disableClose?: boolean;
}

/**
 * Accessible modal: surface panel + hairline border over a dim warm backdrop
 * (no heavy blur). Closes on Escape and backdrop click; locks body scroll while
 * open. Content animates in via `animate-fade-in`.
 */
export function Modal({ open, onClose, title, children, footer, disableClose = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, disableClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 grid place-items-center p-4"
      style={{ zIndex: 'var(--z-modal)' }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Dim warm backdrop — no heavy blur. */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={disableClose ? undefined : onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(20, 18, 14, 0.55)' }}
      />
      {/* Panel */}
      <div className="card relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-5 animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-normal text-ink">{title}</h2>
          {!disableClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-11 w-11 place-items-center rounded-sm text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <IconClose className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-muted">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
