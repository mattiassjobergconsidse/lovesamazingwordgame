import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_TOAST_MS,
  ToastContext,
  type ToastOptions,
} from "../../hooks/toastContext";
import { useI18n } from "../../i18n";
import "./common.css";

interface ActiveToast extends ToastOptions {
  readonly id: number;
}

/** Shows one toast at a time in a polite live region and hides it after a timeout. */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const api = useMemo(
    () => ({
      showToast: (options: ToastOptions) => {
        setToast((previous) => ({ ...options, id: (previous?.id ?? 0) + 1 }));
      },
    }),
    [],
  );

  const toastId = toast?.id;
  const durationMs = toast?.durationMs ?? DEFAULT_TOAST_MS;
  useEffect(() => {
    if (toastId === undefined) {
      return;
    }
    const timer = setTimeout(() => {
      setToast(null);
    }, durationMs);
    return () => {
      clearTimeout(timer);
    };
  }, [toastId, durationMs]);

  return (
    <ToastContext value={api}>
      {children}
      <div role="status" aria-label={t("toast.label")} className="toast-region">
        {toast !== null && (
          <div
            className={
              toast.celebrate === true ? "toast toast-celebrate" : "toast"
            }
            key={toast.id}
          >
            <span>{toast.message}</span>
            {toast.actionLabel !== undefined && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
