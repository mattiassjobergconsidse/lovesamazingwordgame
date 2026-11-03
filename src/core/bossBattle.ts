import type { AnswerResult, MascotId } from "../types";
import { MASCOT_IDS } from "./mascots";
import type { Rng } from "./shuffle";

/** Fewest words a boss needs; smaller pools are not a fight (NH-15). */
export const MIN_BOSS_WORDS = 3;
/** Most words one boss is built from, so a fight stays short. */
export const MAX_BOSS_WORDS = 10;
/** Health the boss has per word of its pool. */
export const HP_PER_WORD = 10;
/** Health the boss regains when a question is answered wrongly ("a little"). */
export const HEAL_ON_WRONG = 3;

/** Where the words of a boss come from (NH-15). */
export type BossPoolSource = "mistakes" | "hardest";

/** How many words each source offers. */
export type BossPoolCounts = Readonly<Record<BossPoolSource, number>>;

/**
 * Chooses the pool of a boss.
 *
 * @param counts Number of words each source offers.
 * @param requested A source the user asked for; without one the last session's
 *   mistakes win over the hardest words because they are the freshest.
 * @returns The pool to use, or `null` when no pool has {@link MIN_BOSS_WORDS} words.
 */
export function resolveBossPool(
  counts: BossPoolCounts,
  requested?: BossPoolSource,
): BossPoolSource | null {
  if (requested !== undefined) {
    return counts[requested] >= MIN_BOSS_WORDS ? requested : null;
  }
  if (counts.mistakes >= MIN_BOSS_WORDS) {
    return "mistakes";
  }
  return counts.hardest >= MIN_BOSS_WORDS ? "hardest" : null;
}

/** The boss's health. `remaining` counts words not yet answered correctly. */
export interface BossState {
  readonly hp: number;
  readonly maxHp: number;
  readonly remaining: number;
}

/**
 * Creates a boss at full health.
 *
 * @param wordCount Number of words in its pool.
 */
export function startBoss(wordCount: number): BossState {
  const maxHp = wordCount * HP_PER_WORD;
  return { hp: maxHp, maxHp, remaining: wordCount };
}

/** Whether every word has been answered correctly. */
export function isBossDefeated(boss: BossState): boolean {
  return boss.remaining === 0;
}

/**
 * Applies one answer to the boss.
 *
 * A correct (or assisted) answer solves a word and deals `floor(hp / remaining)`
 * damage. That keeps `hp >= remaining` after every blow, so the bar reaches zero
 * exactly when the last word is solved, however much the boss healed before.
 * A wrong answer heals {@link HEAL_ON_WRONG}, capped at full health.
 *
 * @param boss Current state.
 * @param result The answer just given.
 * @returns The new state; the same one when the boss is already defeated.
 */
export function applyBossAnswer(
  boss: BossState,
  result: AnswerResult,
): BossState {
  if (isBossDefeated(boss)) {
    return boss;
  }
  if (result === "wrong") {
    return { ...boss, hp: Math.min(boss.maxHp, boss.hp + HEAL_ON_WRONG) };
  }
  return {
    ...boss,
    hp: boss.hp - Math.floor(boss.hp / boss.remaining),
    remaining: boss.remaining - 1,
  };
}

/**
 * Replays a session's answers on a fresh boss.
 *
 * @param wordCount Number of words in the pool.
 * @param answers Every answer of the session in order, repeats included.
 */
export function bossAfterAnswers(
  wordCount: number,
  answers: readonly AnswerResult[],
): BossState {
  return answers.reduce(applyBossAnswer, startBoss(wordCount));
}

/** How a boss question is answered: picking an option or typing. */
export type BossQuestionKind = "quiz" | "writing";

/**
 * Chooses the input of a boss question: the first try is a Quiz question and a
 * word that was missed comes back as a Writing question, which is harder.
 *
 * @param isRepeat Whether the card is a re-queued word.
 */
export function bossQuestionKind(isRepeat: boolean): BossQuestionKind {
  return isRepeat ? "writing" : "quiz";
}

/**
 * Picks the mascot that plays the boss: anyone but the user's own mascot.
 *
 * @param player The mascot the user chose.
 * @param rng Random source returning values in [0, 1).
 */
export function pickBossMascot(player: MascotId, rng: Rng): MascotId {
  const candidates = MASCOT_IDS.filter((id) => id !== player);
  return candidates[Math.floor(rng() * candidates.length)] ?? player;
}
