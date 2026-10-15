import { useContext } from "react";
import { ToastContext, type ToastApi } from "./toastContext";

/**
 * Access the toast function.
 *
 * @throws If used outside a `ToastProvider`.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return api;
}
