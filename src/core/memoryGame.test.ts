import { describe, expect, it } from "vitest";
import {
  createMemoryGame,
  flipCard,
  hasMismatch,
  hideMismatch,
  isMemoryComplete,
  type MemoryState,
} from "./memoryGame";

const rng = () => 0.3;

/** Indices of the two cards with the same emoji, and of a card with another one. */
function layout(state: MemoryState) {
  const first = 0;
  const pair = state.cards.findIndex(
    (card, i) => i !== first && card.emoji === state.cards[first]?.emoji,
  );
  const other = state.cards.findIndex(
    (card) => card.emoji !== state.cards[first]?.emoji,
  );
  return { first, pair, other };
}

describe("memory game", () => {
  it("NH-11: deals pairs of emojis, each twice", () => {
    const state = createMemoryGame(rng, 6);
    const counts = new Map<string, number>();
    for (const { emoji } of state.cards) {
      counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
    }
    expect(state.cards).toHaveLength(12);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
  });

  it("NH-11: is deterministic for a seeded rng", () => {
    expect(createMemoryGame(rng)).toEqual(createMemoryGame(rng));
  });

  it("NH-11: matching cards stay matched and count one move", () => {
    const start = createMemoryGame(rng);
    const { first, pair } = layout(start);
    const state = flipCard(flipCard(start, first), pair);

    expect(state.cards[first]?.matched).toBe(true);
    expect(state.cards[pair]?.matched).toBe(true);
    expect(state.faceUp).toEqual([]);
    expect(state.moves).toBe(1);
  });

  it("NH-11: a mismatch stays face up until hidden", () => {
    const start = createMemoryGame(rng);
    const { first, other } = layout(start);
    const state = flipCard(flipCard(start, first), other);

    expect(hasMismatch(state)).toBe(true);
    expect(state.moves).toBe(1);
    expect(hideMismatch(state).faceUp).toEqual([]);
    expect(hideMismatch(start)).toBe(start);
  });

  it("NH-11: flipping a third card hides a mismatch first, so no timer is needed", () => {
    const start = createMemoryGame(rng);
    const { first, pair, other } = layout(start);
    const state = flipCard(flipCard(flipCard(start, first), other), pair);

    expect(state.faceUp).toEqual([pair]);
    expect(state.moves).toBe(1);
  });

  it("NH-11: ignores matched, face-up and unknown cards", () => {
    const start = createMemoryGame(rng);
    const { first } = layout(start);
    const flipped = flipCard(start, first);

    expect(flipCard(flipped, first)).toBe(flipped);
    expect(flipCard(start, 99)).toBe(start);
  });

  it("NH-11: is complete when every pair is found", () => {
    let state = createMemoryGame(rng, 2);
    expect(isMemoryComplete(state)).toBe(false);
    for (const emoji of new Set(state.cards.map((card) => card.emoji))) {
      const [a, b] = state.cards
        .map((card, i) => (card.emoji === emoji ? i : -1))
        .filter((i) => i >= 0);
      state = flipCard(flipCard(state, a ?? 0), b ?? 0);
    }
    expect(isMemoryComplete(state)).toBe(true);
  });
});
