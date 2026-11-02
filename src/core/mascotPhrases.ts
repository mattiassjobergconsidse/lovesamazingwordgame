import type { AnswerResult, MascotId } from "../types";

/** Moments at which a mascot says something (NH-12). */
export const MASCOT_EVENTS = [
  "greeting",
  "modeSelect",
  "correct",
  "wrong",
  "streak",
  "trophy",
  "sessionPerfect",
  "sessionDone",
] as const;

/** One of the {@link MASCOT_EVENTS}. */
export type MascotEvent = (typeof MASCOT_EVENTS)[number];

/** 1-based position of a phrase inside its pool of three (SPEC: 3 to 5 per event and mascot). */
export type MascotPhraseIndex = 1 | 2 | 3;

const INDEX_TEXT = { 1: "1", 2: "2", 3: "3" } as const;

/** Dictionary key of one phrase; `en.ts` and `sv.ts` must provide every combination. */
export type MascotPhraseKey =
  `mascot.${MascotId}.${MascotEvent}.${MascotPhraseIndex}`;

/** Correct answers in a row that make the mascot cheer about a streak. */
export const STREAK_MILESTONES: readonly number[] = [3, 5, 10, 15, 20, 30, 50];

/**
 * Tells whether a run of correct answers deserves a streak reaction.
 *
 * @param streak Consecutive correct answers including the latest one.
 */
export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}

/** How the mascot moves while it speaks. */
export type MascotMood = "idle" | "cheer" | "oops";

/**
 * Chooses the animation that goes with an event.
 *
 * @param event The moment the mascot reacts to.
 */
export function mascotMoodFor(event: MascotEvent): MascotMood {
  switch (event) {
    case "wrong":
      return "oops";
    case "correct":
    case "streak":
    case "trophy":
    case "sessionPerfect":
      return "cheer";
    case "greeting":
    case "modeSelect":
    case "sessionDone":
      return "idle";
  }
}

/**
 * Decides how the mascot reacts to one answer and what the streak becomes.
 * An assisted answer ends the streak but is not worth a comment either way.
 *
 * @param streak Correct answers in a row before this answer.
 * @param result The answer just given.
 * @returns The new streak and the event to speak about, or `null` for silence.
 */
export function reactToAnswer(
  streak: number,
  result: AnswerResult,
): { readonly streak: number; readonly event: MascotEvent | null } {
  switch (result) {
    case "correct": {
      const next = streak + 1;
      return {
        streak: next,
        event: isStreakMilestone(next) ? "streak" : "correct",
      };
    }
    case "wrong":
      return { streak: 0, event: "wrong" };
    case "assisted":
      return { streak: 0, event: null };
  }
}

/**
 * Builds the dictionary key of a phrase.
 *
 * @param mascot Who speaks.
 * @param event The moment.
 * @param index 1-based position in the pool.
 */
export function mascotPhraseKey(
  mascot: MascotId,
  event: MascotEvent,
  index: MascotPhraseIndex,
): MascotPhraseKey {
  return `mascot.${mascot}.${event}.${INDEX_TEXT[index]}`;
}

/**
 * Picks a random phrase of a mascot for an event.
 *
 * @param mascot Who speaks.
 * @param event The moment.
 * @param rng Random source returning values in [0, 1).
 * @param previous Index returned last time for this event; avoided so the same line is not repeated back to back.
 * @returns The phrase key and its index, to pass as `previous` next time.
 */
export function pickMascotPhrase(
  mascot: MascotId,
  event: MascotEvent,
  rng: () => number,
  previous?: MascotPhraseIndex,
): { readonly key: MascotPhraseKey; readonly index: MascotPhraseIndex } {
  const candidates = ([1, 2, 3] as const).filter((index) => index !== previous);
  const index =
    candidates[Math.min(Math.floor(rng() * candidates.length), 2)] ?? 1;
  return { key: mascotPhraseKey(mascot, event, index), index };
}
