/** Direction in which a word pair is practised: prompt is A and answer is B, or the reverse. */
export type Direction = "AtoB" | "BtoA";

/** A named list of word pairs with two user-defined language labels. */
export interface WordSet {
  readonly id: string;
  /** Mandatory, trimmed, 1..60 chars, unique (case-insensitive). */
  readonly name: string;
  /** Label of language A, e.g. "Svenska", 1..30 chars. */
  readonly langA: string;
  /** Label of language B, e.g. "English", 1..30 chars. */
  readonly langB: string;
  /** Optional BCP-47 tag for speech (NH-2), e.g. "sv-SE". */
  readonly langACode?: string;
  /** Optional BCP-47 tag for speech (NH-2), e.g. "en-GB". */
  readonly langBCode?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** One term in language A with its translation in language B. */
export interface WordPair {
  readonly id: string;
  readonly setId: string;
  readonly a: string;
  readonly b: string;
  /** Optional alternatives accepted as correct answers, e.g. "big; large" gives ["large"]. */
  readonly altA?: readonly string[];
  readonly altB?: readonly string[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Leitner box: 0 = new/unseen, 1..5 = learning up to mastered. */
export type Box = 0 | 1 | 2 | 3 | 4 | 5;

/** Spaced repetition state, one record per word pair. */
export interface WordProgress {
  readonly pairId: string;
  readonly setId: string;
  readonly box: Box;
  /** Epoch ms of the next time the word is due. */
  readonly dueAt: number;
  readonly correct: number;
  readonly wrong: number;
  readonly lastSeenAt: number | null;
  /** Consecutive correct answers. */
  readonly streak: number;
}

export type UiLanguage = "sv" | "en";
/** Fun themes (P7) and extra palettes (NH-3). Each one is a fixed palette with its own light or dark colour scheme. */
export type FunTheme =
  "christmas" | "halloween" | "blocks" | "battle" | "ocean" | "sunset";
/** A theme the user can choose; `system` follows the OS light/dark preference. */
export type Theme = "light" | "dark" | "system" | FunTheme;
/** A theme as applied to the page, i.e. never `system`. */
export type ResolvedTheme = Exclude<Theme, "system">;
export type DirectionMode = "random" | Direction;
export type SessionSize = 10 | 20 | 50 | "all";

/** User preferences, stored as a single record. */
export interface Settings {
  readonly uiLanguage: UiLanguage;
  readonly theme: Theme;
  readonly activeSetId: string | null;
  readonly directionMode: DirectionMode;
  readonly sessionSize: SessionSize;
  /** When true, accent-only differences count as correct in Writing mode (FR-WR-2). */
  readonly ignoreAccents: boolean;
  readonly speechEnabled: boolean;
}

/** One record per set and local calendar day, used for streaks and the 14-day chart. */
export interface DailyActivity {
  /** `${setId}:${date}` */
  readonly id: string;
  readonly setId: string;
  /** Local date "YYYY-MM-DD". */
  readonly date: string;
  readonly answered: number;
  readonly correct: number;
}

/** Outcome of answering one card. `assisted` = hint used or accent-only difference. */
export type AnswerResult = "correct" | "wrong" | "assisted";
