import type { ImportPlan } from "../core/importPlan";
import { mergeTrophies } from "../core/trophies";
import type { TrophyRecord } from "../core/trophyDefinitions";
import type { WordGameDatabase } from "./db";
import { runTransaction } from "./transaction";

/**
 * Writes an import in one transaction: replaced sets are deleted with all
 * their data, then the new sets, pairs, progress and activity are stored
 * (FR-IO-2). Nothing is stored if any write fails.
 *
 * @param db Open database.
 * @param plan What to delete and write; ids must already be fresh.
 * @param trophies Imported trophies, merged with the stored ones (earliest unlock wins).
 * @throws If a write fails; the database is left unchanged then.
 */
export async function applyImportPlan(
  db: WordGameDatabase,
  plan: ImportPlan,
  trophies: readonly TrophyRecord[] = [],
): Promise<void> {
  const tx = db.transaction(
    ["sets", "pairs", "progress", "activity", "trophies"],
    "readwrite",
  );
  await runTransaction(tx, async (track) => {
    if (trophies.length > 0) {
      const stored = await track(tx.objectStore("trophies").getAll());
      await Promise.all(
        mergeTrophies(stored, trophies).map((record) =>
          track(tx.objectStore("trophies").put(record)),
        ),
      );
    }

    for (const setId of plan.removeSetIds) {
      const [pairIds, progressIds, activityIds] = await Promise.all([
        track(tx.objectStore("pairs").index("setId").getAllKeys(setId)),
        track(tx.objectStore("progress").index("setId").getAllKeys(setId)),
        track(tx.objectStore("activity").index("setId").getAllKeys(setId)),
      ]);
      await Promise.all([
        track(tx.objectStore("sets").delete(setId)),
        ...pairIds.map((id) => track(tx.objectStore("pairs").delete(id))),
        ...progressIds.map((id) =>
          track(tx.objectStore("progress").delete(id)),
        ),
        ...activityIds.map((id) =>
          track(tx.objectStore("activity").delete(id)),
        ),
      ]);
    }
    await Promise.all([
      ...plan.sets.map((set) => track(tx.objectStore("sets").put(set))),
      ...plan.pairs.map((pair) => track(tx.objectStore("pairs").put(pair))),
      ...plan.progress.map((record) =>
        track(tx.objectStore("progress").put(record)),
      ),
      ...plan.activity.map((day) => track(tx.objectStore("activity").put(day))),
    ]);
  });
}

/**
 * Deletes all sets, pairs, progress, activity and trophies in one transaction (FR-IO-4).
 * Settings are kept; the caller clears the active set.
 *
 * @throws If a delete fails; nothing is deleted then.
 */
export async function clearLibrary(db: WordGameDatabase): Promise<void> {
  const tx = db.transaction(
    ["sets", "pairs", "progress", "activity", "trophies"],
    "readwrite",
  );
  await runTransaction(tx, (track) =>
    Promise.all([
      track(tx.objectStore("sets").clear()),
      track(tx.objectStore("pairs").clear()),
      track(tx.objectStore("progress").clear()),
      track(tx.objectStore("activity").clear()),
      track(tx.objectStore("trophies").clear()),
    ]),
  );
}
