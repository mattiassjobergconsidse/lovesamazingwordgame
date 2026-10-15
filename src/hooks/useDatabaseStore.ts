import { useCallback, useEffect, useState } from "react";
import { isIndexedDbAvailable, openAppDb } from "../storage/db";
import type { WordGameDatabase } from "../storage/db";
import { seedFirstVisit } from "../storage/exampleSeed";
import type { DatabaseStore, StorageErrorKind } from "./databaseContext";
import { createInitialSettings } from "./initialSettings";

/**
 * Opens the app database once, prepares first-visit data and shares the
 * connection. Closes it on unmount or when another tab needs an upgrade.
 *
 * @returns The store to hand to a `DatabaseContext` provider.
 */
export function useDatabaseStore(): DatabaseStore {
  const [db, setDb] = useState<WordGameDatabase | null>(null);
  const [storageError, setStorageError] = useState<StorageErrorKind | null>(
    () => (isIndexedDbAvailable() ? null : "unavailable"),
  );

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
        void dbPromise.then((opened) => {
          opened.close();
        });
      },
      onTerminated: () => {
        setStorageError("failed");
      },
    });

    void (async () => {
      try {
        const opened = await dbPromise;
        await seedFirstVisit(opened, createInitialSettings(), {
          now: Date.now(),
          newId: () => crypto.randomUUID(),
        });
        if (!abort.signal.aborted) {
          setDb(opened);
        }
      } catch (error) {
        console.error("Failed to open the database", error);
        if (!abort.signal.aborted) {
          setStorageError("failed");
        }
      }
    })();

    return () => {
      abort.abort();
      // A failed open is already reported above; only release a successful connection.
      void dbPromise.then(
        (opened) => {
          opened.close();
        },
        () => undefined,
      );
    };
  }, []);

  const reportStorageError = useCallback((kind: StorageErrorKind) => {
    setStorageError(kind);
  }, []);

  return { db, storageError, reportStorageError };
}
