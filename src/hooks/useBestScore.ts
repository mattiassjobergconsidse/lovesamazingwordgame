import { useCallback, useEffect, useState } from "react";
import { loadBestScore, saveBestScore } from "../storage/bestScoresRepo";
import { isIndexedDbAvailable } from "../storage/db";
import { useDatabase } from "./useDatabase";

/** The best Speed Round score of a set and a way to record a new one (NH-16). */
export interface BestScore {
  /** `loading` until the stored score has been read. */
  readonly status: "loading" | "ready";
  /**
   * The best score stored when the hook mounted, i.e. the one to beat. It does
   * not change when {@link BestScore.submit} stores a new best, so the end
   * screen can still say what the old record was.
   */
  readonly best: number | null;
  /** Stores `score` if it beats the stored best; a failure is reported as a storage error. */
  readonly submit: (score: number) => void;
}

/**
 * Reads the best timed Speed Round score of a set once and lets the caller
 * record a new one.
 *
 * @param setId The set whose score is tracked.
 * @throws If used outside a `DatabaseProvider`.
 */
export function useBestScore(setId: string): BestScore {
  const { db, reportStorageError } = useDatabase();
  const [loaded, setLoaded] = useState<{
    readonly status: "loading" | "ready";
    readonly best: number | null;
  }>(() => ({
    status: isIndexedDbAvailable() ? "loading" : "ready",
    best: null,
  }));

  useEffect(() => {
    if (db === null) {
      return;
    }
    const abort = new AbortController();
    void loadBestScore(db, setId)
      .then((best) => {
        if (!abort.signal.aborted) {
          setLoaded({ status: "ready", best });
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load the best score", error);
        if (!abort.signal.aborted) {
          reportStorageError("failed");
          setLoaded({ status: "ready", best: null });
        }
      });
    return () => {
      abort.abort();
    };
  }, [db, setId, reportStorageError]);

  const submit = useCallback(
    (score: number) => {
      if (db === null) {
        return;
      }
      saveBestScore(db, { setId, score, achievedAt: Date.now() }).catch(
        (error: unknown) => {
          console.error("Failed to save the best score", error);
          reportStorageError("failed");
        },
      );
    },
    [db, setId, reportStorageError],
  );

  return { status: loaded.status, best: loaded.best, submit };
}
