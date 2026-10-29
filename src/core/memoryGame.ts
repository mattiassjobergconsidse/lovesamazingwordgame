import { shuffle, type Rng } from "./shuffle";

/** Emojis the memory cards are drawn from. */
export const MEMORY_EMOJIS = [
  "🐶",
  "🐱",
  "🦊",
  "🐼",
  "🦁",
  "🐸",
  "🐙",
  "🦄",
  "🍎",
  "🚀",
  "⚽",
  "🌈",
] as const;

/** Pairs on the board; 6 pairs make a 4x3 grid that takes about a minute. */
export const MEMORY_PAIRS = 6;

export interface MemoryCard {
  readonly emoji: string;
  readonly matched: boolean;
}

/** Immutable state of an emoji memory game. */
export interface MemoryState {
  readonly cards: readonly MemoryCard[];
  /** Indices currently turned face up and not yet matched (0..2). */
  readonly faceUp: readonly number[];
  /** Number of pairs the user has turned over. */
  readonly moves: number;
}

/**
 * Deals a shuffled board.
 *
 * @param rng Injected random source.
 * @param pairCount Number of pairs, at most the number of emojis.
 */
export function createMemoryGame(
  rng: Rng,
  pairCount: number = MEMORY_PAIRS,
): MemoryState {
  const emojis = shuffle(MEMORY_EMOJIS, rng).slice(0, pairCount);
  const cards = shuffle([...emojis, ...emojis], rng).map((emoji) => ({
    emoji,
    matched: false,
  }));
  return { cards, faceUp: [], moves: 0 };
}

/** Whether two cards without a match are showing and wait to be hidden. */
export function hasMismatch(state: MemoryState): boolean {
  return state.faceUp.length === 2;
}

/** Turns a showing mismatch face down again. */
export function hideMismatch(state: MemoryState): MemoryState {
  return hasMismatch(state) ? { ...state, faceUp: [] } : state;
}

/**
 * Turns a card face up. A showing mismatch is hidden first, so the game also
 * works without a timer.
 *
 * @returns The next state; the same state for matched, face-up or unknown cards.
 */
export function flipCard(state: MemoryState, index: number): MemoryState {
  const card = state.cards[index];
  if (card === undefined || card.matched || state.faceUp.includes(index)) {
    return state;
  }
  const faceUp = [...hideMismatch(state).faceUp, index];
  const [first, second] = faceUp;
  if (second === undefined || first === undefined) {
    return { ...state, faceUp };
  }
  const moves = state.moves + 1;
  if (state.cards[first]?.emoji !== card.emoji) {
    return { ...state, faceUp, moves };
  }
  return {
    cards: state.cards.map((c, i) =>
      i === first || i === second ? { ...c, matched: true } : c,
    ),
    faceUp: [],
    moves,
  };
}

/** Whether every pair has been found. */
export function isMemoryComplete(state: MemoryState): boolean {
  return state.cards.every((card) => card.matched);
}
