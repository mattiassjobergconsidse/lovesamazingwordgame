import { createContext } from "react";

/** A short message with an optional action, e.g. Undo (FR-SET-6). */
export interface ToastOptions {
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  /** Time before it disappears; defaults to 5 s. */
  readonly durationMs?: number;
}

export const DEFAULT_TOAST_MS = 5000;

export interface ToastApi {
  /** Shows a toast, replacing the one on screen. */
  readonly showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
