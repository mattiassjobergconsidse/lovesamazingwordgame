import type { WordPair, WordProgress } from "../types";

/** What the set list shows per set (FR-SET-5). */
export interface SetSummary {
  readonly wordCount: number;
  /** Words due now; words never practised count as due (box 0 is due immediately). */
  readonly dueCount: number;
  /** Latest time any word was practised, or `null` if never. */
  readonly lastPractisedAt: number | null;
}

/**
 * Summarises one set.
 *
 * @param pairs Pairs of the set.
 * @param progress Progress records of the set (may be missing for new words).
 * @param now Current time in epoch ms.
 */
export function summarizeSet(
  pairs: readonly Pick<WordPair, "id">[],
  progress: readonly Pick<WordProgress, "pairId" | "dueAt" | "lastSeenAt">[],
  now: number,
): SetSummary {
  const byPair = new Map(progress.map((record) => [record.pairId, record]));
  let dueCount = 0;
  let lastPractisedAt: number | null = null;
  for (const pair of pairs) {
    const record = byPair.get(pair.id);
    if (record === undefined || record.dueAt <= now) {
      dueCount += 1;
    }
    const seenAt = record?.lastSeenAt ?? null;
    if (
      seenAt !== null &&
      (lastPractisedAt === null || seenAt > lastPractisedAt)
    ) {
      lastPractisedAt = seenAt;
    }
  }
  return { wordCount: pairs.length, dueCount, lastPractisedAt };
}
