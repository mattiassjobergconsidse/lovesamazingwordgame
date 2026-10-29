import type { DailyActivity, WordProgress } from "../types";
import type { SessionState } from "./session";
import { practiceStreak } from "./stats";
import {
  TROPHY_DEFINITIONS,
  type TrophyId,
  type TrophyMode,
  type TrophyRecord,
  type TrophyRule,
} from "./trophyDefinitions";

/** The box of a mastered word (FR-ST-1). */
const MASTERED_BOX = 5;

/** What happened when a training session ended. */
export interface SessionEndEvent {
  readonly mode: TrophyMode;
  /** Every word was answered correctly on the first try, without help. */
  readonly perfect: boolean;
}

/** Everything the rules are computed from. */
export interface TrophyInput {
  /** Trophies that are already unlocked; these are never reported again. */
  readonly unlocked: ReadonlySet<TrophyId>;
  /** Progress of all sets. */
  readonly progress: readonly Pick<WordProgress, "box">[];
  /** Activity of all sets. */
  readonly activity: readonly Pick<
    DailyActivity,
    "date" | "answered" | "correct"
  >[];
  /** The session that just ended. */
  readonly event: SessionEndEvent;
  /** Epoch ms; decides whether today still counts for the streak. */
  readonly now: number;
}

/**
 * Whether every word of a finished session was answered correctly on the
 * first try (hints, "almost" and wrong answers all count against it).
 *
 * @param session The finished session.
 */
export function isPerfectSession(session: SessionState): boolean {
  return (
    session.total > 0 &&
    session.firstResults.size === session.total &&
    [...session.firstResults.values()].every((result) => result === "correct")
  );
}

function isRuleMet(rule: TrophyRule, input: TrophyInput): boolean {
  switch (rule.kind) {
    case "firstSession":
      return true;
    case "streak":
      return practiceStreak(input.activity, input.now) >= rule.days;
    case "mastered":
      return (
        input.progress.filter((record) => record.box === MASTERED_BOX).length >=
        rule.words
      );
    case "perfectWriting":
      return input.event.mode === "writing" && input.event.perfect;
    case "modeSession":
      return input.event.mode === rule.mode;
    case "correctAnswers":
      return (
        input.activity.reduce((sum, day) => sum + day.correct, 0) >= rule.count
      );
  }
}

/**
 * Finds the trophies a just-ended session unlocks.
 *
 * @param input Current data and the session event.
 * @returns Ids of newly unlocked trophies, in display order.
 */
export function evaluateTrophies(input: TrophyInput): readonly TrophyId[] {
  return TROPHY_DEFINITIONS.filter(
    (definition) =>
      !input.unlocked.has(definition.id) && isRuleMet(definition.rule, input),
  ).map((definition) => definition.id);
}

/**
 * Combines two sets of unlocks, e.g. stored ones and imported ones. A trophy
 * keeps its earliest unlock time.
 *
 * @param current Trophies already stored.
 * @param incoming Trophies to add.
 * @returns One record per trophy, in display order.
 */
export function mergeTrophies(
  current: readonly TrophyRecord[],
  incoming: readonly TrophyRecord[],
): readonly TrophyRecord[] {
  const earliest = new Map<TrophyId, number>();
  for (const record of [...current, ...incoming]) {
    const known = earliest.get(record.id);
    if (known === undefined || record.unlockedAt < known) {
      earliest.set(record.id, record.unlockedAt);
    }
  }
  return TROPHY_DEFINITIONS.flatMap(({ id }) => {
    const unlockedAt = earliest.get(id);
    return unlockedAt === undefined ? [] : [{ id, unlockedAt }];
  });
}
