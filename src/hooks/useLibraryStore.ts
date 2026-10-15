import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BulkParsedPair } from "../core/bulkParse";
import { localDateKey } from "../core/activity";
import { parseTerms } from "../core/pairText";
import {
  makeUniqueName,
  normalizeSetFields,
  validateSetFields,
  type SetFields,
} from "../core/setValidation";
import { applyResult, createProgress } from "../core/spacedRepetition";
import { isIndexedDbAvailable, type WordGameDatabase } from "../storage/db";
import {
  deletePairWithProgress,
  putPairs,
  restorePairWithProgress,
} from "../storage/pairsRepo";
import { saveAnswer } from "../storage/progressRepo";
import {
  deleteSetCascade,
  loadLibrary,
  putSet,
  putSetWithPairs,
  type LibrarySnapshot,
} from "../storage/setsRepo";
import type { AnswerResult, WordPair, WordSet } from "../types";
import type {
  Library,
  PairInput,
  RemovedPair,
  SetResult,
} from "./libraryContext";
import { useDatabase } from "./useDatabase";
import { useSettings } from "./useSettings";

const EMPTY: LibrarySnapshot = { sets: [], pairs: [], progress: [] };

function buildPair(
  setId: string,
  input: PairInput,
  now: number,
  newId: () => string,
): WordPair | null {
  const termsA = parseTerms(input.a);
  const termsB = parseTerms(input.b);
  if (termsA.main === "" || termsB.main === "") {
    return null;
  }
  return {
    id: newId(),
    setId,
    a: termsA.main,
    b: termsB.main,
    ...(termsA.alternatives.length > 0 ? { altA: termsA.alternatives } : {}),
    ...(termsB.alternatives.length > 0 ? { altB: termsB.alternatives } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Owns the in-memory sets, pairs and progress: reads them once when the
 * database opens and writes every change through in the background.
 * Storage failures are reported through the shared storage error state; the
 * in-memory data stays usable (same policy as settings).
 *
 * @returns The library to hand to a `LibraryContext` provider.
 * @throws If used outside a `DatabaseProvider` and `SettingsProvider`.
 */
export function useLibraryStore(): Library {
  const { db, reportStorageError } = useDatabase();
  const { settings, updateSettings } = useSettings();
  const [data, setData] = useState<LibrarySnapshot>(EMPTY);
  const [status, setStatus] = useState<"loading" | "ready">(() =>
    isIndexedDbAvailable() ? "loading" : "ready",
  );
  const dataRef = useRef(data);
  const activeSetId = settings.activeSetId;

  useEffect(() => {
    if (db === null) {
      return;
    }
    const abort = new AbortController();
    void (async () => {
      try {
        const snapshot = await loadLibrary(db);
        if (abort.signal.aborted) {
          return;
        }
        dataRef.current = snapshot;
        setData(snapshot);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load the library", error);
        if (!abort.signal.aborted) {
          reportStorageError("failed");
        }
      }
    })();
    return () => {
      abort.abort();
    };
  }, [db, reportStorageError]);

  const commit = useCallback((next: LibrarySnapshot) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const persist = useCallback(
    (write: (database: WordGameDatabase) => Promise<void>) => {
      if (db === null) {
        return;
      }
      write(db).catch((error: unknown) => {
        console.error("Failed to save the library", error);
        reportStorageError("failed");
      });
    },
    [db, reportStorageError],
  );

  const createSet = useCallback(
    (fields: SetFields): SetResult => {
      const current = dataRef.current;
      const normalized = normalizeSetFields(fields);
      const errors = validateSetFields(
        normalized,
        current.sets.map((set) => set.name),
      );
      if (Object.keys(errors).length > 0) {
        return { ok: false, errors };
      }
      const now = Date.now();
      const set: WordSet = {
        id: crypto.randomUUID(),
        ...normalized,
        createdAt: now,
        updatedAt: now,
      };
      commit({ ...current, sets: [...current.sets, set] });
      persist((database) => putSet(database, set));
      return { ok: true, set };
    },
    [commit, persist],
  );

  const updateSet = useCallback(
    (id: string, fields: SetFields): SetResult => {
      const current = dataRef.current;
      const existing = current.sets.find((set) => set.id === id);
      const normalized = normalizeSetFields(fields);
      const errors = validateSetFields(
        normalized,
        current.sets.filter((set) => set.id !== id).map((set) => set.name),
      );
      if (existing === undefined || Object.keys(errors).length > 0) {
        return { ok: false, errors };
      }
      const set: WordSet = {
        ...existing,
        ...normalized,
        updatedAt: Date.now(),
      };
      commit({
        ...current,
        sets: current.sets.map((candidate) =>
          candidate.id === id ? set : candidate,
        ),
      });
      persist((database) => putSet(database, set));
      return { ok: true, set };
    },
    [commit, persist],
  );

  const duplicateSet = useCallback(
    (id: string, baseName: string): WordSet | null => {
      const current = dataRef.current;
      const source = current.sets.find((set) => set.id === id);
      if (source === undefined) {
        return null;
      }
      const now = Date.now();
      const copy: WordSet = {
        ...source,
        id: crypto.randomUUID(),
        name: makeUniqueName(
          baseName,
          current.sets.map((set) => set.name),
        ),
        createdAt: now,
        updatedAt: now,
      };
      // Progress is deliberately not copied (FR-SET-4).
      const copiedPairs = current.pairs
        .filter((pair) => pair.setId === id)
        .map((pair, index): WordPair => ({
          ...pair,
          id: crypto.randomUUID(),
          setId: copy.id,
          createdAt: now + index,
          updatedAt: now,
        }));
      commit({
        ...current,
        sets: [...current.sets, copy],
        pairs: [...current.pairs, ...copiedPairs],
      });
      persist((database) => putSetWithPairs(database, copy, copiedPairs));
      return copy;
    },
    [commit, persist],
  );

  const deleteSet = useCallback(
    (id: string) => {
      const current = dataRef.current;
      commit({
        sets: current.sets.filter((set) => set.id !== id),
        pairs: current.pairs.filter((pair) => pair.setId !== id),
        progress: current.progress.filter((record) => record.setId !== id),
      });
      persist((database) => deleteSetCascade(database, id));
      if (activeSetId === id) {
        updateSettings({ activeSetId: null });
      }
    },
    [activeSetId, commit, persist, updateSettings],
  );

  const addParsedPairs = useCallback(
    (setId: string, parsed: readonly BulkParsedPair[]): readonly WordPair[] => {
      const now = Date.now();
      const created = parsed.flatMap((entry, index) => {
        const pair = buildPair(
          setId,
          {
            a: [entry.a, ...entry.altA].join(";"),
            b: [entry.b, ...entry.altB].join(";"),
          },
          now + index,
          () => crypto.randomUUID(),
        );
        return pair === null ? [] : [pair];
      });
      if (created.length === 0) {
        return created;
      }
      const current = dataRef.current;
      commit({ ...current, pairs: [...current.pairs, ...created] });
      persist((database) => putPairs(database, created));
      return created;
    },
    [commit, persist],
  );

  const addPair = useCallback(
    (setId: string, input: PairInput): WordPair | null => {
      const pair = buildPair(setId, input, Date.now(), () =>
        crypto.randomUUID(),
      );
      if (pair === null) {
        return null;
      }
      const current = dataRef.current;
      commit({ ...current, pairs: [...current.pairs, pair] });
      persist((database) => putPairs(database, [pair]));
      return pair;
    },
    [commit, persist],
  );

  const updatePair = useCallback(
    (pairId: string, input: PairInput): boolean => {
      const current = dataRef.current;
      const existing = current.pairs.find((pair) => pair.id === pairId);
      if (existing === undefined) {
        return false;
      }
      const rebuilt = buildPair(
        existing.setId,
        input,
        Date.now(),
        () => pairId,
      );
      if (rebuilt === null) {
        return false;
      }
      // Keep the original creation time so the row does not jump, and the id so progress stays linked.
      const pair: WordPair = { ...rebuilt, createdAt: existing.createdAt };
      commit({
        ...current,
        pairs: current.pairs.map((candidate) =>
          candidate.id === pairId ? pair : candidate,
        ),
      });
      persist((database) => putPairs(database, [pair]));
      return true;
    },
    [commit, persist],
  );

  const removePair = useCallback(
    (pairId: string): RemovedPair | null => {
      const current = dataRef.current;
      const pair = current.pairs.find((candidate) => candidate.id === pairId);
      if (pair === undefined) {
        return null;
      }
      const progress =
        current.progress.find((record) => record.pairId === pairId) ?? null;
      commit({
        ...current,
        pairs: current.pairs.filter((candidate) => candidate.id !== pairId),
        progress: current.progress.filter((record) => record.pairId !== pairId),
      });
      persist((database) => deletePairWithProgress(database, pairId));
      return { pair, progress };
    },
    [commit, persist],
  );

  const restorePair = useCallback(
    (removed: RemovedPair) => {
      const current = dataRef.current;
      commit({
        ...current,
        pairs: [...current.pairs, removed.pair].sort(
          (left, right) => left.createdAt - right.createdAt,
        ),
        progress:
          removed.progress === null
            ? current.progress
            : [...current.progress, removed.progress],
      });
      persist((database) =>
        restorePairWithProgress(database, removed.pair, removed.progress),
      );
    },
    [commit, persist],
  );

  const recordAnswer = useCallback(
    (pair: WordPair, result: AnswerResult, now: number) => {
      const current = dataRef.current;
      const previous =
        current.progress.find((record) => record.pairId === pair.id) ??
        createProgress(pair);
      const updated = applyResult(previous, result, now);
      const exists = current.progress.some(
        (record) => record.pairId === pair.id,
      );
      commit({
        ...current,
        progress: exists
          ? current.progress.map((record) =>
              record.pairId === pair.id ? updated : record,
            )
          : [...current.progress, updated],
      });
      persist((database) =>
        saveAnswer(database, updated, localDateKey(now), result),
      );
    },
    [commit, persist],
  );

  return useMemo(
    () => ({
      status,
      sets: data.sets,
      pairs: data.pairs,
      progress: data.progress,
      createSet,
      updateSet,
      duplicateSet,
      deleteSet,
      addPair,
      addParsedPairs,
      updatePair,
      removePair,
      restorePair,
      recordAnswer,
    }),
    [
      status,
      data,
      createSet,
      updateSet,
      duplicateSet,
      deleteSet,
      addPair,
      addParsedPairs,
      updatePair,
      removePair,
      restorePair,
      recordAnswer,
    ],
  );
}
