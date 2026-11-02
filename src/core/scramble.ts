import type { AnswerResult } from "../types";
import { isGuessableLetter } from "./hangman";
import { shuffle, type Rng } from "./shuffle";

/** State of one Word Scramble round (NH-13). Immutable: every action returns a new state. */
export interface ScrambleState {
  /** The word to build, NFC normalised, original casing kept for display. */
  readonly answer: string;
  /** The answer's letters (lower case) in shuffled order; a tile is identified by its index. */
  readonly tiles: readonly string[];
  /** Tile indexes in the order they were placed; placed[k] fills the k-th letter slot. */
  readonly placed: readonly number[];
  /** Whether a hint was used; the round then ends as `assisted`. */
  readonly hinted: boolean;
  readonly gaveUp: boolean;
}

/** Whether a round is still running. */
export type ScrambleStatus = "playing" | "solved" | "gaveUp";

/** One character of the answer as shown to the player. */
export interface ScrambleSlot {
  /** The placed letter while playing, the real answer character once the round ended. */
  readonly char: string;
  /** False for spaces, hyphens, digits and punctuation: they are fixed and never shuffled. */
  readonly isLetter: boolean;
  /** The tile placed in this slot, or `null` when empty (or revealed by giving up). */
  readonly tileIndex: number | null;
}

/** Normalises a character for comparison; accents stay distinct (`ä` is not `a`). */
function normalizeLetter(char: string): string {
  return char.normalize("NFC").toLowerCase();
}

function answerLetters(answer: string): string[] {
  return Array.from(answer).filter(isGuessableLetter).map(normalizeLetter);
}

/**
 * Shuffles letters. When the letters contain at least two distinct ones, the result
 * never equals the input order, so a round never starts already solved.
 *
 * @param letters The letters to shuffle; the input is never mutated.
 * @param rng Injected random source.
 */
export function shuffleLetters(letters: readonly string[], rng: Rng): string[] {
  const result = shuffle(letters, rng);
  if (result.some((letter, index) => letter !== letters[index])) {
    return result;
  }
  const first = result[0];
  const differing = result.findIndex((letter) => letter !== first);
  const other = result[differing];
  if (first === undefined || other === undefined) {
    return result;
  }
  // Swapping two different letters of an unchanged order always changes it.
  result[0] = other;
  result[differing] = first;
  return result;
}

/**
 * Starts a round for `answer`.
 *
 * @param answer The word or phrase to build.
 * @param rng Injected random source for the shuffle.
 */
export function createScramble(answer: string, rng: Rng): ScrambleState {
  const normalized = answer.normalize("NFC").trim();
  return {
    answer: normalized,
    tiles: shuffleLetters(answerLetters(normalized), rng),
    placed: [],
    hinted: false,
    gaveUp: false,
  };
}

/**
 * Current status: solved when the placed letters spell the answer. An answer without
 * letters (for example "42") is solved immediately.
 *
 * @param state The round.
 */
export function scrambleStatus(state: ScrambleState): ScrambleStatus {
  if (state.gaveUp) {
    return "gaveUp";
  }
  const letters = answerLetters(state.answer);
  const spelled =
    state.placed.length === letters.length &&
    state.placed.every((tile, slot) => state.tiles[tile] === letters[slot]);
  return spelled ? "solved" : "playing";
}

/**
 * Whether every letter slot is filled but the letters are in the wrong order,
 * so the player has to remove something.
 *
 * @param state The round.
 */
export function isFullButWrong(state: ScrambleState): boolean {
  return (
    scrambleStatus(state) === "playing" &&
    state.placed.length === state.tiles.length
  );
}

/**
 * Places a tile in the next free slot. Used tiles, unknown tiles, a full row and
 * a finished round are ignored and return the same state.
 *
 * @param state The round.
 * @param tileIndex Index into `state.tiles`.
 */
export function placeTile(
  state: ScrambleState,
  tileIndex: number,
): ScrambleState {
  if (
    scrambleStatus(state) !== "playing" ||
    tileIndex < 0 ||
    tileIndex >= state.tiles.length ||
    state.placed.includes(tileIndex) ||
    state.placed.length >= state.tiles.length
  ) {
    return state;
  }
  return { ...state, placed: [...state.placed, tileIndex] };
}

/**
 * Places an unused tile that shows the typed letter. Characters without a free
 * matching tile are ignored.
 *
 * @param state The round.
 * @param char The typed character, any case.
 */
export function placeLetter(state: ScrambleState, char: string): ScrambleState {
  if (!isGuessableLetter(char)) {
    return state;
  }
  const letter = normalizeLetter(char);
  const tileIndex = state.tiles.findIndex(
    (tile, index) => tile === letter && !state.placed.includes(index),
  );
  return tileIndex === -1 ? state : placeTile(state, tileIndex);
}

/**
 * Takes one placed tile back; the tiles after it move one slot to the left.
 *
 * @param state The round.
 * @param tileIndex Index into `state.tiles`.
 */
export function removeTile(
  state: ScrambleState,
  tileIndex: number,
): ScrambleState {
  if (
    scrambleStatus(state) !== "playing" ||
    !state.placed.includes(tileIndex)
  ) {
    return state;
  }
  return {
    ...state,
    placed: state.placed.filter((placed) => placed !== tileIndex),
  };
}

/**
 * Takes back the most recently placed tile (Backspace).
 *
 * @param state The round.
 */
export function removeLastTile(state: ScrambleState): ScrambleState {
  const last = state.placed[state.placed.length - 1];
  return last === undefined ? state : removeTile(state, last);
}

/**
 * Places the next correct letter and marks the round as assisted. Wrongly placed
 * letters at the end of the row are removed first, so a hint always helps.
 *
 * @param state The round.
 */
export function applyHint(state: ScrambleState): ScrambleState {
  if (scrambleStatus(state) !== "playing") {
    return state;
  }
  const letters = answerLetters(state.answer);
  const firstWrong = state.placed.findIndex(
    (tile, slot) => state.tiles[tile] !== letters[slot],
  );
  const correctPrefix = firstWrong === -1 ? state.placed.length : firstWrong;
  const kept = state.placed.slice(0, correctPrefix);
  const next = letters[correctPrefix];
  const tileIndex = state.tiles.findIndex(
    (tile, index) => tile === next && !kept.includes(index),
  );
  if (tileIndex === -1) {
    return state;
  }
  return { ...state, placed: [...kept, tileIndex], hinted: true };
}

/**
 * Ends the round by revealing the answer.
 *
 * @param state The round.
 */
export function giveUp(state: ScrambleState): ScrambleState {
  return scrambleStatus(state) === "playing"
    ? { ...state, gaveUp: true }
    : state;
}

/**
 * Result to record for a finished round: solved without a hint is `correct`, with a
 * hint `assisted`, given up `wrong`.
 *
 * @param state The round.
 * @returns `null` while the round is still running.
 */
export function scrambleResult(state: ScrambleState): AnswerResult | null {
  switch (scrambleStatus(state)) {
    case "playing":
      return null;
    case "gaveUp":
      return "wrong";
    case "solved":
      return state.hinted ? "assisted" : "correct";
  }
}

/**
 * The answer as slots for display. Fixed characters (spaces, hyphens) keep their
 * place so word boundaries stay visible.
 *
 * @param state The round.
 */
export function scrambleSlots(state: ScrambleState): ScrambleSlot[] {
  const status = scrambleStatus(state);
  const finished = status !== "playing";
  let letterSlot = 0;
  return Array.from(state.answer).map((char) => {
    if (!isGuessableLetter(char)) {
      return { char, isLetter: false, tileIndex: null };
    }
    const tileIndex = state.placed[letterSlot] ?? null;
    letterSlot += 1;
    if (finished) {
      return {
        char,
        isLetter: true,
        tileIndex: status === "gaveUp" ? null : tileIndex,
      };
    }
    return {
      char: tileIndex === null ? "" : (state.tiles[tileIndex] ?? ""),
      isLetter: true,
      tileIndex,
    };
  });
}
