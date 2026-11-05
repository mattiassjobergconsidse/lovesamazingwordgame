import { isNewBest, type BestScoreRecord } from "../core/speedRound";
import type { WordGameDatabase } from "./db";
import { runTransaction } from "./transaction";

/** Checks a stored record, since IndexedDB content is not trusted (FR-BP-1). */
function isBestScoreRecord(value: unknown): value is BestScoreRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    !("setId" in value) ||
    !("score" in value) ||
    !("achievedAt" in value)
  ) {
    return false;
  }
  const { setId, score, achievedAt } = value;
  return (
    typeof setId === "string" &&
    typeof score === "number" &&
    Number.isFinite(score) &&
    score >= 0 &&
    typeof achievedAt === "number"
  );
}

/**
 * Reads the best timed Speed Round score of a set (NH-16).
 *
 * @param db Open database.
 * @param setId The set.
 * @returns The best score, or `null` when there is none or the record is damaged.
 */
export async function loadBestScore(
  db: WordGameDatabase,
  setId: string,
): Promise<number | null> {
  const record: unknown = await db.get("bestScores", setId);
  return isBestScoreRecord(record) ? record.score : null;
}

/**
 * Stores a score if it beats the stored best of the set. Reading and writing
 * share one transaction, so two tabs cannot overwrite a higher score.
 *
 * @param db Open database.
 * @param record The score just reached.
 * @returns True when the record was stored as the new best.
 * @throws If the transaction fails; nothing is stored then.
 */
export async function saveBestScore(
  db: WordGameDatabase,
  record: BestScoreRecord,
): Promise<boolean> {
  const tx = db.transaction("bestScores", "readwrite");
  return await runTransaction(tx, async (track) => {
    const stored: unknown = await track(tx.store.get(record.setId));
    const best = isBestScoreRecord(stored) ? stored.score : null;
    if (!isNewBest(record.score, best)) {
      return false;
    }
    await track(tx.store.put(record));
    return true;
  });
}
