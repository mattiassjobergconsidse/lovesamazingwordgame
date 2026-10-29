import type { Rng } from "./shuffle";

export type Pad = 0 | 1 | 2 | 3;

export const PADS: readonly Pad[] = [0, 1, 2, 3];

/** Reaching this many rounds wins, which keeps a game at about two minutes. */
export const SIMON_MAX_ROUNDS = 8;

/** Immutable state of a Simon pattern game. */
export interface SimonState {
  /** "showing": the pattern plays; "input": the user repeats it. */
  readonly phase: "showing" | "input" | "over" | "won";
  readonly sequence: readonly Pad[];
  /** Position in the sequence the user has to repeat next. */
  readonly inputIndex: number;
}

function randomPad(rng: Rng): Pad {
  return PADS[Math.floor(rng() * PADS.length)] ?? 0;
}

/** Starts a game with a one-pad pattern that is shown first. */
export function startSimon(rng: Rng): SimonState {
  return { phase: "showing", sequence: [randomPad(rng)], inputIndex: 0 };
}

/** Called by the UI when the pattern has finished playing; the user's turn begins. */
export function finishShowing(state: SimonState): SimonState {
  return state.phase === "showing"
    ? { ...state, phase: "input", inputIndex: 0 }
    : state;
}

/**
 * Handles a pad press. A wrong pad ends the game; completing the pattern adds
 * one pad and shows it again, or wins after {@link SIMON_MAX_ROUNDS}.
 *
 * @returns The next state; presses outside the input phase are ignored.
 */
export function pressPad(state: SimonState, pad: Pad, rng: Rng): SimonState {
  if (state.phase !== "input") {
    return state;
  }
  if (state.sequence[state.inputIndex] !== pad) {
    return { ...state, phase: "over" };
  }
  if (state.inputIndex + 1 < state.sequence.length) {
    return { ...state, inputIndex: state.inputIndex + 1 };
  }
  if (state.sequence.length >= SIMON_MAX_ROUNDS) {
    return { ...state, phase: "won" };
  }
  return {
    phase: "showing",
    sequence: [...state.sequence, randomPad(rng)],
    inputIndex: 0,
  };
}

/** Number of patterns the user repeated completely. */
export function roundsCompleted(state: SimonState): number {
  return state.phase === "won"
    ? state.sequence.length
    : state.sequence.length - 1;
}
