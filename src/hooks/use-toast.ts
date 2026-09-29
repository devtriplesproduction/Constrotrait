"use client";

import { create } from "zustand";

export type ToastVariant = "default" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration || 5000);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = (props: Omit<Toast, "id">) => useToastStore.getState().addToast(props);

export function useToast() {
  const { addToast, removeToast, toasts } = useToastStore();

  return {
    toasts,
    toast: (props: Omit<Toast, "id">) => addToast(props),
    dismiss: (id: string) => removeToast(id),
  };
}
