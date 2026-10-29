import { isTrophyId, type TrophyRecord } from "../core/trophyDefinitions";
import type { WordGameDatabase } from "./db";
import { runTransaction } from "./transaction";

/**
 * Reads all unlocked trophies. Records with an id this version does not know
 * (e.g. written by a newer version) are ignored.
 *
 * @param db Open database.
 */
export async function loadTrophies(
  db: WordGameDatabase,
): Promise<readonly TrophyRecord[]> {
  const records = await db.getAll("trophies");
  return records.filter((record) => isTrophyId(record.id));
}

/**
 * Stores newly unlocked trophies in one transaction (NH-10).
 *
 * @param db Open database.
 * @param records Trophies to add; an existing record with the same id is replaced.
 * @throws If a write fails; nothing is stored then.
 */
export async function putTrophies(
  db: WordGameDatabase,
  records: readonly TrophyRecord[],
): Promise<void> {
  const tx = db.transaction("trophies", "readwrite");
  await runTransaction(tx, (track) =>
    Promise.all(records.map((record) => track(tx.store.put(record)))),
  );
}
