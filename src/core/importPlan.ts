import type { DailyActivity, WordPair, WordProgress, WordSet } from "../types";
import type { SetBundle } from "./exportFormat";
import { makeUniqueName } from "./setValidation";

/** What to do with an imported set whose name is already taken (FR-IO-2). */
export type ConflictChoice = "rename" | "replace" | "skip";

/** An imported set that clashes with an existing set of the same name. */
export interface ImportConflict {
  readonly incomingId: string;
  readonly name: string;
  readonly existingId: string;
}

/** Everything the storage layer must write, computed without I/O. */
export interface ImportPlan {
  /** Existing sets to delete first (with all their data), for "replace". */
  readonly removeSetIds: readonly string[];
  readonly sets: readonly WordSet[];
  readonly pairs: readonly WordPair[];
  readonly progress: readonly WordProgress[];
  readonly activity: readonly DailyActivity[];
  /** Replaced set id to the id of its replacement, so the active set can follow. */
  readonly replacements: ReadonlyMap<string, string>;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Finds imported sets whose name already exists (case-insensitive).
 *
 * @param bundles Sets read from the file.
 * @param existing Sets already stored.
 */
export function findConflicts(
  bundles: readonly SetBundle[],
  existing: readonly WordSet[],
): readonly ImportConflict[] {
  return bundles.flatMap(({ set }) => {
    const clash = existing.find((other) => sameName(other.name, set.name));
    return clash === undefined
      ? []
      : [{ incomingId: set.id, name: set.name, existingId: clash.id }];
  });
}

/**
 * Plans an import: resolves name conflicts and gives every imported record a
 * fresh id, so importing the same file twice, or into another browser, never
 * collides with stored data.
 *
 * @param bundles Sets read from the file.
 * @param existing Sets already stored.
 * @param choices Decision per conflicting set, keyed by the set's id in the file; missing means "rename".
 * @param newId Id generator, injected for deterministic tests.
 */
export function planImport(
  bundles: readonly SetBundle[],
  existing: readonly WordSet[],
  choices: ReadonlyMap<string, ConflictChoice>,
  newId: () => string,
): ImportPlan {
  const conflicts = new Map(
    findConflicts(bundles, existing).map((conflict) => [
      conflict.incomingId,
      conflict,
    ]),
  );
  const takenNames = existing.map((set) => set.name);
  const removeSetIds: string[] = [];
  const sets: WordSet[] = [];
  const pairs: WordPair[] = [];
  const progress: WordProgress[] = [];
  const activity: DailyActivity[] = [];
  const replacements = new Map<string, string>();

  for (const bundle of bundles) {
    const conflict = conflicts.get(bundle.set.id);
    const choice =
      conflict === undefined
        ? undefined
        : (choices.get(bundle.set.id) ?? "rename");
    if (choice === "skip") {
      continue;
    }
    const setId = newId();
    let name = bundle.set.name;
    if (conflict !== undefined && choice === "replace") {
      removeSetIds.push(conflict.existingId);
      replacements.set(conflict.existingId, setId);
    } else if (conflict !== undefined) {
      name = makeUniqueName(name, takenNames);
    }
    takenNames.push(name);
    sets.push({ ...bundle.set, id: setId, name });

    const pairIds = new Map<string, string>();
    for (const pair of bundle.pairs) {
      const id = newId();
      pairIds.set(pair.id, id);
      pairs.push({ ...pair, id, setId });
    }
    for (const record of bundle.progress) {
      const pairId = pairIds.get(record.pairId);
      if (pairId !== undefined) {
        progress.push({ ...record, pairId, setId });
      }
    }
    for (const day of bundle.activity) {
      activity.push({ ...day, id: `${setId}:${day.date}`, setId });
    }
  }
  return { removeSetIds, sets, pairs, progress, activity, replacements };
}
