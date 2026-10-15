import { useContext } from "react";
import { SettingsContext, type SettingsStore } from "./settingsContext";

/**
 * Access the settings and update function.
 *
 * @throws If used outside a `SettingsProvider`.
 */
export function useSettings(): SettingsStore {
  const store = useContext(SettingsContext);
  if (store === null) {
    throw new Error("useSettings must be used inside a SettingsProvider");
  }
  return store;
}
