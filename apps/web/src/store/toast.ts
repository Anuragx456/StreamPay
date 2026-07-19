// Lightweight toast store. Components call push()/dismiss(); the <Toaster/>
// subscribes and animates entries in/out.

import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, title: string, detail?: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, title, detail) => {
    const id = `t${Date.now()}${Math.floor(Math.random() * 1000)}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind, title, detail }] }));
    // Auto-dismiss after 4s.
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience helpers for the common cases. */
export const toast = {
  success: (title: string, detail?: string) =>
    useToastStore.getState().push('success', title, detail),
  error: (title: string, detail?: string) =>
    useToastStore.getState().push('error', title, detail),
  info: (title: string, detail?: string) =>
    useToastStore.getState().push('info', title, detail),
};
