import { useCallback, useMemo } from "react";
import { localDateKey } from "../core/activity";
import { csvToBundle, nameFromFileName, parseCsv, toCsv } from "../core/csv";
import {
  buildExport,
  fileSlug,
  parseExport,
  type ImportProblem,
  type SetBundle,
} from "../core/exportFormat";
import {
  findConflicts,
  planImport,
  type ConflictChoice,
  type ImportConflict,
} from "../core/importPlan";
import type { TrophyRecord } from "../core/trophyDefinitions";
import { applyImportPlan, clearLibrary } from "../storage/exportImport";
import {
  downloadTextFile,
  MAX_IMPORT_FILE_BYTES,
  readFileText,
} from "../storage/fileIo";
import { useDatabase } from "./useDatabase";
import { useLibrary } from "./useLibrary";
import { useSettings } from "./useSettings";

/** A file that has been read and validated but not yet imported. */
export type ImportDraft =
  | {
      readonly ok: true;
      readonly bundles: readonly SetBundle[];
      /** Sets that need a decision before importing (FR-IO-2). */
      readonly conflicts: readonly ImportConflict[];
      /** Trophies from the file, merged into the stored ones on import (NH-10). */
      readonly trophies?: readonly TrophyRecord[];
    }
  | { readonly ok: false; readonly problems: readonly ImportProblem[] };

/** Export, import and reset of the user's data (FR-IO-*). */
export interface DataExchange {
  /** False until the library is loaded; exporting or importing earlier would miss data. */
  readonly ready: boolean;
  /** Downloads one set as a JSON file; progress and activity only when `includeProgress`. */
  readonly exportSet: (setId: string, includeProgress: boolean) => void;
  /** Downloads all data as one JSON file named after today's date; trophies come with the progress. */
  readonly exportAll: (includeProgress: boolean) => void;
  /** Downloads one set as CSV for Excel. Does nothing for an unknown id. */
  readonly exportCsv: (setId: string) => void;
  /** Reads and validates a JSON or CSV file; never throws, problems are returned. */
  readonly readImportFile: (file: File) => Promise<ImportDraft>;
  /**
   * Imports a validated draft in one transaction.
   *
   * @returns The number of sets imported, or `null` when storing failed (the
   *   storage error banner is shown and nothing was stored).
   */
  readonly commitImport: (
    bundles: readonly SetBundle[],
    choices: ReadonlyMap<string, ConflictChoice>,
    trophies?: readonly TrophyRecord[],
  ) => Promise<number | null>;
  /** Deletes all sets and their data and clears the active set (FR-IO-4). */
  readonly resetAll: () => Promise<boolean>;
}

function looksLikeJson(text: string): boolean {
  return text
    .trimStart()
    .replace(/^\uFEFF/, "")
    .startsWith("{");
}

/**
 * Connects the export and import logic to the library, storage and file I/O.
 *
 * @throws If used outside the database, settings and library providers.
 */
export function useDataExchange(): DataExchange {
  const { db, reportStorageError } = useDatabase();
  const { settings, updateSettings } = useSettings();
  const library = useLibrary();
  const { sets, pairs, progress, activity, trophies, reload } = library;
  const activeSetId = settings.activeSetId;

  const downloadJson = useCallback(
    (
      setIds: readonly string[],
      includeProgress: boolean,
      fileName: string,
      includeTrophies: boolean,
    ) => {
      const file = buildExport(
        {
          sets,
          pairs,
          progress,
          activity,
          ...(includeTrophies ? { trophies } : {}),
        },
        setIds,
        includeProgress,
        Date.now(),
      );
      downloadTextFile(
        fileName,
        JSON.stringify(file, null, 2),
        "application/json",
      );
    },
    [sets, pairs, progress, activity, trophies],
  );

  const exportSet = useCallback(
    (setId: string, includeProgress: boolean) => {
      const set = sets.find((candidate) => candidate.id === setId);
      if (set !== undefined) {
        downloadJson(
          [setId],
          includeProgress,
          `${fileSlug(set.name)}.json`,
          false,
        );
      }
    },
    [sets, downloadJson],
  );

  const exportAll = useCallback(
    (includeProgress: boolean) => {
      downloadJson(
        sets.map((set) => set.id),
        includeProgress,
        `lovesamazingwordgame-backup-${localDateKey(Date.now())}.json`,
        true,
      );
    },
    [downloadJson, sets],
  );

  const exportCsv = useCallback(
    (setId: string) => {
      const set = sets.find((candidate) => candidate.id === setId);
      if (set === undefined) {
        return;
      }
      downloadTextFile(
        `${fileSlug(set.name)}.csv`,
        toCsv(
          set,
          pairs.filter((pair) => pair.setId === setId),
        ),
        "text/csv;charset=utf-8",
      );
    },
    [sets, pairs],
  );

  const readImportFile = useCallback(
    async (file: File): Promise<ImportDraft> => {
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        return {
          ok: false,
          problems: [{ path: file.name, reason: "tooLarge" }],
        };
      }
      let text: string;
      try {
        text = await readFileText(file);
      } catch (error) {
        console.error("Failed to read the import file", error);
        return {
          ok: false,
          problems: [{ path: file.name, reason: "unreadable" }],
        };
      }
      let bundles: readonly SetBundle[];
      let importedTrophies: readonly TrophyRecord[] | undefined;
      if (looksLikeJson(text)) {
        const parsed = parseExport(text);
        if (!parsed.ok) {
          return parsed;
        }
        bundles = parsed.bundles;
        importedTrophies = parsed.trophies;
      } else {
        const parsed = parseCsv(text);
        if (!parsed.ok) {
          return parsed;
        }
        bundles = [
          csvToBundle(parsed, nameFromFileName(file.name), Date.now(), () =>
            crypto.randomUUID(),
          ),
        ];
      }
      return {
        ok: true,
        bundles,
        conflicts: findConflicts(bundles, sets),
        ...(importedTrophies === undefined
          ? {}
          : { trophies: importedTrophies }),
      };
    },
    [sets],
  );

  const commitImport = useCallback(
    async (
      bundles: readonly SetBundle[],
      choices: ReadonlyMap<string, ConflictChoice>,
      importedTrophies: readonly TrophyRecord[] = [],
    ): Promise<number | null> => {
      if (db === null) {
        return null;
      }
      const plan = planImport(bundles, sets, choices, () =>
        crypto.randomUUID(),
      );
      try {
        await applyImportPlan(db, plan, importedTrophies);
        await reload();
      } catch (error) {
        console.error("Failed to import", error);
        reportStorageError("failed");
        return null;
      }
      const replacement =
        activeSetId === null ? undefined : plan.replacements.get(activeSetId);
      const next =
        replacement ?? (activeSetId === null ? plan.sets[0]?.id : undefined);
      if (next !== undefined) {
        updateSettings({ activeSetId: next });
      }
      return plan.sets.length;
    },
    [db, sets, reload, reportStorageError, activeSetId, updateSettings],
  );

  const resetAll = useCallback(async (): Promise<boolean> => {
    if (db === null) {
      return false;
    }
    try {
      await clearLibrary(db);
      await reload();
    } catch (error) {
      console.error("Failed to reset", error);
      reportStorageError("failed");
      return false;
    }
    updateSettings({ activeSetId: null });
    return true;
  }, [db, reload, reportStorageError, updateSettings]);

  return useMemo(
    () => ({
      ready: library.status === "ready",
      exportSet,
      exportAll,
      exportCsv,
      readImportFile,
      commitImport,
      resetAll,
    }),
    [
      library.status,
      exportSet,
      exportAll,
      exportCsv,
      readImportFile,
      commitImport,
      resetAll,
    ],
  );
}
