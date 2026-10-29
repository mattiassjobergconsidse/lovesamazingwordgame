/** Training modes that can earn a "first session" trophy; mirrors the router's `TrainMode`. */
export type TrophyMode =
  "flashcards" | "quiz" | "matching" | "writing" | "hangman";

/** The condition that unlocks a trophy (NH-10). */
export type TrophyRule =
  /** Any training session was completed. */
  | { readonly kind: "firstSession" }
  /** Practice on this many consecutive days. */
  | { readonly kind: "streak"; readonly days: number }
  /** This many words in box 5, over all sets. */
  | { readonly kind: "mastered"; readonly words: number }
  /** A Writing session in which every first answer was correct. */
  | { readonly kind: "perfectWriting" }
  /** A session was completed in this mode. */
  | { readonly kind: "modeSession"; readonly mode: TrophyMode }
  /** This many correct answers in total, over all sets. */
  | { readonly kind: "correctAnswers"; readonly count: number };

/** A trophy as shown on the trophy screen. */
export interface TrophyDefinition {
  readonly id: string;
  /** Decorative emoji (NH-8). */
  readonly emoji: string;
  readonly rule: TrophyRule;
}

/**
 * All trophies in display order. This is the one place to add a trophy or tune a
 * threshold; each id needs `trophy.<id>.name` in both dictionaries.
 */
export const TROPHY_DEFINITIONS = [
  { id: "firstSession", emoji: "🏁", rule: { kind: "firstSession" } },
  { id: "streak3", emoji: "🔥", rule: { kind: "streak", days: 3 } },
  { id: "streak7", emoji: "🌟", rule: { kind: "streak", days: 7 } },
  { id: "streak14", emoji: "💪", rule: { kind: "streak", days: 14 } },
  { id: "streak30", emoji: "👑", rule: { kind: "streak", days: 30 } },
  { id: "mastered10", emoji: "🌱", rule: { kind: "mastered", words: 10 } },
  { id: "mastered50", emoji: "🌳", rule: { kind: "mastered", words: 50 } },
  { id: "mastered100", emoji: "🏔️", rule: { kind: "mastered", words: 100 } },
  { id: "perfectWriting", emoji: "✏️", rule: { kind: "perfectWriting" } },
  {
    id: "modeFlashcards",
    emoji: "🃏",
    rule: { kind: "modeSession", mode: "flashcards" },
  },
  {
    id: "modeQuiz",
    emoji: "❓",
    rule: { kind: "modeSession", mode: "quiz" },
  },
  {
    id: "modeMatching",
    emoji: "🧩",
    rule: { kind: "modeSession", mode: "matching" },
  },
  {
    id: "modeWriting",
    emoji: "📝",
    rule: { kind: "modeSession", mode: "writing" },
  },
  {
    id: "modeHangman",
    emoji: "🔤",
    rule: { kind: "modeSession", mode: "hangman" },
  },
  {
    id: "correct100",
    emoji: "🎯",
    rule: { kind: "correctAnswers", count: 100 },
  },
  {
    id: "correct500",
    emoji: "🚀",
    rule: { kind: "correctAnswers", count: 500 },
  },
] as const satisfies readonly TrophyDefinition[];

/** Identifier of a trophy, derived from {@link TROPHY_DEFINITIONS}. */
export type TrophyId = (typeof TROPHY_DEFINITIONS)[number]["id"];

/** A stored unlock: which trophy and when (epoch ms). */
export interface TrophyRecord {
  readonly id: TrophyId;
  readonly unlockedAt: number;
}

/**
 * Narrows a string read from storage or a file to a known trophy id.
 *
 * @param value Any string; unknown ids (e.g. from a newer app version) give `false`.
 */
export function isTrophyId(value: string): value is TrophyId {
  return TROPHY_DEFINITIONS.some((definition) => definition.id === value);
}


