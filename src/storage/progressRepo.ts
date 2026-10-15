import { addAnswerToActivity } from "../core/activity";
import type { AnswerResult, WordProgress } from "../types";
import type { WordGameDatabase } from "./db";
import { runTransaction } from "./transaction";

/**
 * Stores the progress of one answered word and adds the answer to the daily
 * activity of its set, in one transaction (FR-TRN-4).
 *
 * @param db Open database.
 * @param progress The updated progress record.
 * @param date Local date key of the answer.
 * @param result Result of the answer.
 * @throws If a write fails; nothing is stored then.
 */
export async function saveAnswer(
  db: WordGameDatabase,
  progress: WordProgress,
  date: string,
  result: AnswerResult,
): Promise<void> {
  const tx = db.transaction(["progress", "activity"], "readwrite");
  await runTransaction(tx, async (track) => {
    const activityStore = tx.objectStore("activity");
    const existing = await track(
      activityStore.get(`${progress.setId}:${date}`),
    );
    await Promise.all([
      track(tx.objectStore("progress").put(progress)),
      track(
        activityStore.put(
          addAnswerToActivity(existing, progress.setId, date, result),
        ),
      ),
    ]);
  });
}
