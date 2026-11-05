import { createContext } from "react";

/** A short message with an optional action, e.g. Undo (FR-SET-6). */
export interface ToastOptions {
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  /** Time before it disappears; defaults to 5 s. */
  readonly durationMs?: number;
  /** Adds a short pop animation, for celebrations such as a trophy (NH-10). */
  readonly celebrate?: boolean;
}

/** Default time a toast stays on screen, in ms. */
export const DEFAULT_TOAST_MS = 5000;

/** What components can do with toasts. */
export interface ToastApi {
  /** Shows a toast, replacing the one on screen. */
  readonly showToast: (options: ToastOptions) => void;
}

/** Context holding the toast API; read it with `useToast`. */
export const ToastContext = createContext<ToastApi | null>(null);
