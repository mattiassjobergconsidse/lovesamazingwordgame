import type { DailyActivity, WordPair, WordProgress } from "../types";
import { computeSetStats, recentActivity, type SetStats } from "./stats";

/** Number of days the home screen accuracy covers. */
export const HOME_ACCURACY_DAYS = 7;

/** Part of the day, used for the greeting. */
export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

/** Figures shown on the home screen for the active set. */
export interface HomeSummary {
  readonly stats: SetStats;
  /** Answers given today. */
  readonly answeredToday: number;
  /** Share of today's goal reached, between 0 and 1. */
  readonly goalProgress: number;
  /** Share of correct first answers over the last days in percent, or `null` without answers. */
  readonly weekAccuracy: number | null;
}

/**
 * Picks the part of the day for a greeting.
 *
 * @param hour Local hour, 0 to 23.
 */
export function dayPeriod(hour: number): DayPeriod {
  if (hour >= 5 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }
  if (hour >= 18 && hour < 22) {
    return "evening";
  }
  return "night";
}

/**
 * Computes the home screen figures of one set.
 *
 * @param pairs Pairs of the set.
 * @param progress Progress records of the set.
 * @param activity Activity records of the set.
 * @param now Epoch ms.
 * @param dailyGoal Answers per day that fill the goal ring.
 */
export function homeSummary(
  pairs: readonly WordPair[],
  progress: readonly WordProgress[],
  activity: readonly DailyActivity[],
  now: number,
  dailyGoal: number,
): HomeSummary {
  const days = recentActivity(activity, now, HOME_ACCURACY_DAYS);
  const answered = days.reduce((sum, day) => sum + day.answered, 0);
  const correct = days.reduce((sum, day) => sum + day.correct, 0);
  const answeredToday = days[days.length - 1]?.answered ?? 0;
  return {
    stats: computeSetStats(pairs, progress, activity, now),
    answeredToday,
    goalProgress: Math.min(1, answeredToday / dailyGoal),
    weekAccuracy:
      answered === 0 ? null : Math.round((correct / answered) * 100),
  };
}
