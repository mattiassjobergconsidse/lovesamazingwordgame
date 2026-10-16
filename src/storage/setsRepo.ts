import type { DailyActivity, WordPair, WordProgress, WordSet } from "../types";
import type { WordGameDatabase } from "./db";
import { runTransaction } from "./transaction";
/** Everything the app keeps in memory (FR-BP-4: read once at startup, write through). */
export interface LibrarySnapshot {
  readonly sets: readonly WordSet[];
  readonly pairs: readonly WordPair[];
  readonly progress: readonly WordProgress[];
  readonly activity: readonly DailyActivity[];
}
/**
 * Reads all sets, pairs, progress and activity in one transaction.
 *
 * @param db Open database.
 * @returns The snapshot; pairs are ordered by creation time so tables stay stable.
 */
export async function loadLibrary(
  db: WordGameDatabase,
): Promise<LibrarySnapshot> {
  const tx = db.transaction(
    ["sets", "pairs", "progress", "activity"],
    "readonly",
  );
  const [sets, pairs, progress, activity] = await runTransaction(tx, (track) =>
    Promise.all([
      track(tx.objectStore("sets").getAll()),
      track(tx.objectStore("pairs").getAll()),
      track(tx.objectStore("progress").getAll()),
      track(tx.objectStore("activity").getAll()),
    ]),
  );
  return {
    sets,
    pairs: [...pairs].sort((left, right) => left.createdAt - right.createdAt),
    progress,
    activity,
  };
}
/** Creates or replaces a set (FR-SET-1, FR-SET-2). */
export async function putSet(
  db: WordGameDatabase,
  set: WordSet,
): Promise<void> {
  await db.put("sets", set);
}
/**
 * Stores a set together with its pairs in one transaction (FR-SET-4).
 *
 * @throws If any write fails; nothing is stored then.
 */
export async function putSetWithPairs(
  db: WordGameDatabase,
  set: WordSet,
  pairs: readonly WordPair[],
): Promise<void> {
  const tx = db.transaction(["sets", "pairs"], "readwrite");
  await runTransaction(tx, (track) =>
    Promise.all([
      track(tx.objectStore("sets").put(set)),
      ...pairs.map((pair) => track(tx.objectStore("pairs").put(pair))),
    ]),
  );
}
/**
 * Deletes a set with its pairs, progress and activity in one transaction (FR-SET-3).
 *
 * @throws If any delete fails; nothing is deleted then.
 */
export async function deleteSetCascade(
  db: WordGameDatabase,
  setId: string,
): Promise<void> {
  const tx = db.transaction(
    ["sets", "pairs", "progress", "activity"],
    "readwrite",
  );
  await runTransaction(tx, async (track) => {
    const [pairIds, progressIds, activityIds] = await Promise.all([
      track(tx.objectStore("pairs").index("setId").getAllKeys(setId)),
      track(tx.objectStore("progress").index("setId").getAllKeys(setId)),
      track(tx.objectStore("activity").index("setId").getAllKeys(setId)),
    ]);
    await Promise.all([
      track(tx.objectStore("sets").delete(setId)),
      ...pairIds.map((id) => track(tx.objectStore("pairs").delete(id))),
      ...progressIds.map((id) => track(tx.objectStore("progress").delete(id))),
      ...activityIds.map((id) => track(tx.objectStore("activity").delete(id))),
    ]);
  });
}
