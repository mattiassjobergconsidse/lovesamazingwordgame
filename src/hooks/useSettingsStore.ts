import { useCallback, useEffect, useRef, useState } from "react";
import { isIndexedDbAvailable } from "../storage/db";
import { writePreferenceMirror } from "../storage/preferenceMirror";
import { loadSettings, saveSettings } from "../storage/settingsRepo";
import type { Settings } from "../types";
import { useDatabase } from "./useDatabase";
import { createInitialSettings } from "./initialSettings";
import type { SettingsStore } from "./settingsContext";

/**
 * Owns the settings state: starts from defaults plus the localStorage mirror
 * (so the first paint is right), then loads the stored settings from IndexedDB
 * and writes every change through to both.
 *
 * @returns The settings store to hand to a `SettingsContext` provider.
 * @throws If used outside a `DatabaseProvider`.
 */
export function useSettingsStore(): SettingsStore {
  const { db, reportStorageError } = useDatabase();
  const [settings, setSettings] = useState<Settings>(createInitialSettings);
  // Without IndexedDB there is nothing to wait for.
  const [ready, setReady] = useState(() => !isIndexedDbAvailable());
  const settingsRef = useRef(settings);
  // Changes made before the stored settings are loaded; they win over the stored values.
  const pendingRef = useRef<Partial<Settings>>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    if (db === null) {
      return;
    }
    const abort = new AbortController();
    const isAborted = (): boolean => abort.signal.aborted;
    void (async () => {
      try {
        const stored = await loadSettings(db);
        if (isAborted()) {
          return;
        }
        // From here until the save below is issued everything runs synchronously, so no
        // change can slip in between: earlier changes are in `pendingRef`, later ones
        // see `loadedRef` and save directly on top of the merged settings.
        const hasPending = Object.keys(pendingRef.current).length > 0;
        const next =
          stored === null
            ? settingsRef.current
            : { ...stored, ...pendingRef.current };
        settingsRef.current = next;
        setSettings(next);
        writePreferenceMirror(next);
        pendingRef.current = {};
        loadedRef.current = true;
        setReady(true);
        if (stored === null || hasPending) {
          // Issued before any later change, so IndexedDB applies it first.
          await saveSettings(db, next);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
        if (!isAborted()) {
          reportStorageError("failed");
        }
      }
    })();
    return () => {
      abort.abort();
    };
  }, [db, reportStorageError]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      setSettings(next);
      writePreferenceMirror(next);

      if (!loadedRef.current) {
        // Not loaded yet: `settingsRef` still holds defaults, so saving now would overwrite
        // the stored settings (for example the active set). The load merges and saves this.
        pendingRef.current = { ...pendingRef.current, ...patch };
        return;
      }
      if (db === null) {
        return;
      }
      void (async () => {
        try {
          await saveSettings(db, next);
        } catch (error) {
          console.error("Failed to save settings", error);
          reportStorageError("failed");
        }
      })();
    },
    [db, reportStorageError],
  );

  return { settings, ready, updateSettings };
}
