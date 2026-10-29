/** The unlockable mini-games (NH-11). */
export const GAME_IDS = ["memory", "catch", "simon"] as const;

export type GameId = (typeof GAME_IDS)[number];

/** Emoji shown next to each game. */
export const GAME_EMOJIS: Readonly<Record<GameId, string>> = {
  memory: "🧠",
  catch: "🧺",
  simon: "🎵",
};

/** Whether `value` is the ID of a mini-game. */
export function isGameId(value: unknown): value is GameId {
  return GAME_IDS.some((id) => id === value);
}

/** One pending play of a mini-game, earned by a perfect Writing session. */
export interface GameUnlock {
  /** Epoch ms when the play was earned. */
  readonly earnedAt: number;
}

/** Shortest session that can earn a play, so tiny sessions cannot be farmed. */
export const MIN_WORDS_FOR_UNLOCK = 5;

/** What the unlock rule needs to know about a finished session. */
export interface UnlockInput {
  readonly mode: string;
  /** Every word answered correctly on the first try, no hints or "almost". */
  readonly perfect: boolean;
  /** Number of times the user overrode a wrong verdict ("I was right"). */
  readonly overrides: number;
  /** Number of distinct words in the session. */
  readonly total: number;
}

/**
 * Whether a finished session earns a mini-game play: a Writing session of at
 * least {@link MIN_WORDS_FOR_UNLOCK} words where every answer was correct
 * without hints, "almost" or overrides.
 */
export function earnsGameUnlock({
  mode,
  perfect,
  overrides,
  total,
}: UnlockInput): boolean {
  return (
    mode === "writing" &&
    perfect &&
    overrides === 0 &&
    total >= MIN_WORDS_FOR_UNLOCK
  );
}

/**
 * Records a new earned play. Unlocks never accumulate, so any earlier one is replaced.
 *
 * @param earnedAt Epoch ms of the perfect session.
 */
export function grantUnlock(earnedAt: number): GameUnlock {
  return { earnedAt };
}

/**
 * Validates a stored value.
 *
 * @returns The unlock, or `null` when the value is missing or malformed.
 */
export function parseGameUnlock(value: unknown): GameUnlock | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const earnedAt = (value as Record<string, unknown>).earnedAt;
  return typeof earnedAt === "number" && Number.isFinite(earnedAt)
    ? { earnedAt }
    : null;
}
