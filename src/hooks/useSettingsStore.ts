import { useCallback, useEffect, useRef, useState } from "react";
import { createDefaultSettings } from "../core/settings";
import {
  isIndexedDbAvailable,
  openAppDb,
  type WordGameDatabase,
} from "../storage/db";
import {
  readPreferenceMirror,
  writePreferenceMirror,
} from "../storage/preferenceMirror";
import { loadSettings, saveSettings } from "../storage/settingsRepo";
import type { Settings } from "../types";
import type { SettingsStore, StorageErrorKind } from "./settingsContext";

function createInitialSettings(): Settings {
  return {
    ...createDefaultSettings(navigator.languages),
    ...readPreferenceMirror(),
  };
}

/**
 * Owns the settings state: starts from defaults plus the localStorage mirror
 * (so the first paint is right), then loads the stored settings from IndexedDB
 * and writes every change through to both.
 *
 * @returns The settings store to hand to a `SettingsContext` provider.
 */
export function useSettingsStore(): SettingsStore {
  const [settings, setSettings] = useState<Settings>(createInitialSettings);
  const [storageError, setStorageError] = useState<StorageErrorKind | null>(
    () => (isIndexedDbAvailable() ? null : "unavailable"),
  );
  const settingsRef = useRef(settings);
  const dbRef = useRef<Promise<WordGameDatabase> | null>(null);

  useEffect(() => {
    if (!isIndexedDbAvailable()) {
      return;
    }
    const abort = new AbortController();
    const dbPromise = openAppDb({
      onBlocked: () => {
        setStorageError("blocked");
      },
      onBlocking: () => {
        void dbPromise.then((db) => {
          db.close();
        });
      },
      onTerminated: () => {
        setStorageError("failed");
      },
    });
    dbRef.current = dbPromise;

    void (async () => {
      try {
        const db = await dbPromise;
        const stored = await loadSettings(db);
        if (abort.signal.aborted) {
          return;
        }
        if (stored === null) {
          await saveSettings(db, settingsRef.current);
          return;
        }
        settingsRef.current = stored;
        setSettings(stored);
        writePreferenceMirror(stored);
      } catch (error) {
        console.error("Failed to load settings", error);
        if (!abort.signal.aborted) {
          setStorageError("failed");
        }
      }
    })();

    return () => {
      abort.abort();
      dbRef.current = null;
      // A failed open is already reported above; only release a successful connection.
      void dbPromise.then(
        (db) => {
          db.close();
        },
        () => undefined,
      );
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    writePreferenceMirror(next);

    const dbPromise = dbRef.current;
    if (dbPromise === null) {
      return;
    }
    void (async () => {
      try {
        await saveSettings(await dbPromise, next);
      } catch (error) {
        console.error("Failed to save settings", error);
        setStorageError("failed");
      }
    })();
  }, []);

  return { settings, storageError, updateSettings };
}
