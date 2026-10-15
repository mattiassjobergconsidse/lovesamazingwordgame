import type { AnswerResult, DailyActivity } from "../types";

/**
 * Formats a timestamp as a local calendar date, the key of daily activity (FR-ST-1).
 *
 * @param timestamp Epoch ms.
 * @returns `YYYY-MM-DD` in the local time zone.
 */
export function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** ID of the activity record of one set and day. */
export function activityId(setId: string, date: string): string {
  return `${setId}:${date}`;
}

/**
 * Adds one first answer to the activity of its day (FR-TRN-4).
 *
 * @param existing The stored record for that set and day, if any.
 * @param setId Set the answer belongs to.
 * @param date Local date key of the answer.
 * @param result Result of the answer; only `correct` counts as correct.
 * @returns The updated record; the input is not modified.
 */
export function addAnswerToActivity(
  existing: DailyActivity | undefined,
  setId: string,
  date: string,
  result: AnswerResult,
): DailyActivity {
  const base = existing ?? {
    id: activityId(setId, date),
    setId,
    date,
    answered: 0,
    correct: 0,
  };
  return {
    ...base,
    answered: base.answered + 1,
    correct: base.correct + (result === "correct" ? 1 : 0),
  };
}

/**
 * Formats a duration for the session summary.
 *
 * @param milliseconds Elapsed time; negative values count as zero.
 * @returns `m:ss`, e.g. `2:05`.
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${String(minutes)}:${seconds}`;
}
