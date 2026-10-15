import type { ReactNode } from "react";
import { SettingsContext } from "../../hooks/settingsContext";
import { useSettingsStore } from "../../hooks/useSettingsStore";

/** Loads settings once and shares them with the whole app. */
export function SettingsProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const store = useSettingsStore();
  return <SettingsContext value={store}>{children}</SettingsContext>;
}
