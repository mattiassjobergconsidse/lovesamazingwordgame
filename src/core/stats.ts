import type { DailyActivity, WordPair, WordProgress } from "../types";
import { localDateKey } from "./activity";
import { isDue } from "./spacedRepetition";

/** Number of days the activity chart shows (FR-ST-3). */
export const CHART_DAYS = 14;
/** Minimum attempts before a word can be called hard (FR-ST-2). */
export const MIN_ATTEMPTS_FOR_HARD = 2;
/** Length of the hardest-words list. */
export const HARDEST_LIMIT = 10;

/** Headline numbers of one set (FR-ST-1). */
export interface SetStats {
  readonly total: number;
  /** Words never answered (box 0 or no record). */
  readonly newWords: number;
  /** Words in boxes 1 to 4. */
  readonly learning: number;
  /** Words in box 5. */
  readonly mastered: number;
  /** Seen words that are due now; new words are counted separately. */
  readonly due: number;
  /** Share of correct first answers in percent (0 to 100), or `null` before any answer. */
  readonly accuracy: number | null;
  /** Consecutive local days with practice, see {@link practiceStreak}. */
  readonly streak: number;
}

/** A word with its mistake ratio, for the hardest-words list (FR-ST-2). */
export interface HardWord {
  readonly pair: WordPair;
  readonly correct: number;
  readonly wrong: number;
  /** `wrong / (correct + wrong)`, between 0 and 1. */
  readonly wrongRatio: number;
}

/** One bar of the activity chart (FR-ST-3). */
export interface DayActivity {
  readonly date: string;
  readonly answered: number;
  readonly correct: number;
}

/**
 * Moves a local date key by whole calendar days.
 *
 * @param dateKey `YYYY-MM-DD`.
 * @param days Days to add; negative goes back in time.
 * @returns The shifted `YYYY-MM-DD`; calendar arithmetic, so DST does not matter.
 */
export function shiftDateKey(dateKey: string, days: number): string {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  return localDateKey(new Date(year, month - 1, day + days).getTime());
}

/**
 * Counts consecutive local days with practice. Today may still be empty
 * without breaking the streak, because the day is not over yet.
 *
 * @param activity Activity records of one set.
 * @param now Epoch ms.
 */
export function practiceStreak(
  activity: readonly Pick<DailyActivity, "date" | "answered">[],
  now: number,
): number {
  const practisedDays = new Set(
    activity.filter((day) => day.answered > 0).map((day) => day.date),
  );
  const today = localDateKey(now);
  let cursor = practisedDays.has(today) ? today : shiftDateKey(today, -1);
  let streak = 0;
  while (practisedDays.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

/**
 * Computes the statistics of one set.
 *
 * @param pairs Pairs of the set.
 * @param progress Progress records of the set.
 * @param activity Activity records of the set.
 * @param now Epoch ms.
 */
export function computeSetStats(
  pairs: readonly Pick<WordPair, "id">[],
  progress: readonly WordProgress[],
  activity: readonly DailyActivity[],
  now: number,
): SetStats {
  const byPair = new Map(progress.map((record) => [record.pairId, record]));
  let newWords = 0;
  let learning = 0;
  let mastered = 0;
  let due = 0;
  for (const pair of pairs) {
    const record = byPair.get(pair.id);
    if (record === undefined || record.box === 0) {
      newWords += 1;
      continue;
    }
    if (record.box === 5) {
      mastered += 1;
    } else {
      learning += 1;
    }
    if (isDue(record, now)) {
      due += 1;
    }
  }
  const answered = activity.reduce((sum, day) => sum + day.answered, 0);
  const correct = activity.reduce((sum, day) => sum + day.correct, 0);
  return {
    total: pairs.length,
    newWords,
    learning,
    mastered,
    due,
    accuracy: answered === 0 ? null : Math.round((correct / answered) * 100),
    streak: practiceStreak(activity, now),
  };
}

/**
 * Finds the words answered wrongly most often.
 *
 * @param pairs Pairs of the set.
 * @param progress Progress records of the set.
 * @param limit Maximum number of words to return.
 * @returns Words with at least {@link MIN_ATTEMPTS_FOR_HARD} attempts and one mistake,
 *   worst first; ties go to the word with more mistakes, then to the earlier word.
 */
export function hardestWords(
  pairs: readonly WordPair[],
  progress: readonly WordProgress[],
  limit: number = HARDEST_LIMIT,
): readonly HardWord[] {
  const byPair = new Map(progress.map((record) => [record.pairId, record]));
  const hard: HardWord[] = [];
  for (const pair of pairs) {
    const record = byPair.get(pair.id);
    if (record === undefined) {
      continue;
    }
    const attempts = record.correct + record.wrong;
    if (attempts >= MIN_ATTEMPTS_FOR_HARD && record.wrong > 0) {
      hard.push({
        pair,
        correct: record.correct,
        wrong: record.wrong,
        wrongRatio: record.wrong / attempts,
      });
    }
  }
  // Array.prototype.sort is stable, so equal words keep their set order.
  return hard
    .sort(
      (left, right) =>
        right.wrongRatio - left.wrongRatio || right.wrong - left.wrong,
    )
    .slice(0, limit);
}

/**
 * Builds the last days of activity, oldest first, with zeros for idle days.
 *
 * @param activity Activity records of one set.
 * @param now Epoch ms; the last bar is the local day of `now`.
 * @param days Number of days to return.
 */
export function recentActivity(
  activity: readonly DailyActivity[],
  now: number,
  days: number = CHART_DAYS,
): readonly DayActivity[] {
  const byDate = new Map(activity.map((day) => [day.date, day]));
  const today = localDateKey(now);
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDateKey(today, index - (days - 1));
    const record = byDate.get(date);
    return {
      date,
      answered: record?.answered ?? 0,
      correct: record?.correct ?? 0,
    };
  });
}
