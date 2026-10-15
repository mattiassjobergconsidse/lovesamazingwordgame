import { renderHook } from "@testing-library/react";
import { DatabaseProvider } from "../src/components/common/DatabaseProvider";
import { useDatabase } from "../src/hooks/useDatabase";
import { useSettingsStore } from "../src/hooks/useSettingsStore";

/** Renders a hook inside a real `DatabaseProvider`. */
export function renderWithDatabase<T>(hook: () => T) {
  return renderHook(hook, { wrapper: DatabaseProvider });
}

/** Renders the settings store together with the shared storage error state. */
export function renderSettingsStore() {
  return renderWithDatabase(() => ({
    ...useSettingsStore(),
    storageError: useDatabase().storageError,
  }));
}
