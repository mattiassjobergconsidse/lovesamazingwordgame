import type { WordPair, WordProgress } from "../types";
import type { WordGameDatabase } from "./db";
import { runTransaction } from "./transaction";
/** Creates or replaces pairs in one transaction (FR-SET-6, FR-SET-8). */
export async function putPairs(
  db: WordGameDatabase,
  pairs: readonly WordPair[],
): Promise<void> {
  const tx = db.transaction("pairs", "readwrite");
  await runTransaction(tx, (track) =>
    Promise.all(pairs.map((pair) => track(tx.store.put(pair)))),
  );
}
/** Deletes a pair and its progress record in one transaction (FR-SET-6). */
export async function deletePairWithProgress(
  db: WordGameDatabase,
  pairId: string,
): Promise<void> {
  const tx = db.transaction(["pairs", "progress"], "readwrite");
  await runTransaction(tx, (track) =>
    Promise.all([
      track(tx.objectStore("pairs").delete(pairId)),
      track(tx.objectStore("progress").delete(pairId)),
    ]),
  );
}
/** Puts a removed pair (and its progress, if it had any) back; used by Undo (FR-SET-6). */
export async function restorePairWithProgress(
  db: WordGameDatabase,
  pair: WordPair,
  progress: WordProgress | null,
): Promise<void> {
  const tx = db.transaction(["pairs", "progress"], "readwrite");
  await runTransaction(tx, (track) =>
    Promise.all([
      track(tx.objectStore("pairs").put(pair)),
      ...(progress === null
        ? []
        : [track(tx.objectStore("progress").put(progress))]),
    ]),
  );
}
