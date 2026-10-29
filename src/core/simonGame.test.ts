import { describe, expect, it } from "vitest";
import {
  SIMON_MAX_ROUNDS,
  finishShowing,
  pressPad,
  roundsCompleted,
  startSimon,
  type Pad,
  type SimonState,
} from "./simonGame";

/** rng that yields pad 2 every time. */
const rng = () => 0.5;

function replay(state: SimonState): SimonState {
  let next = finishShowing(state);
  for (const pad of state.sequence) {
    next = pressPad(next, pad, rng);
  }
  return next;
}

describe("simon game", () => {
  it("NH-11: starts by showing a one-pad pattern", () => {
    const state = startSimon(rng);
    expect(state.phase).toBe("showing");
    expect(state.sequence).toEqual([2]);
  });

  it("NH-11: ignores presses while the pattern is showing", () => {
    const state = startSimon(rng);
    expect(pressPad(state, 0, rng)).toBe(state);
  });

  it("NH-11: a correct full repeat extends the pattern and shows it again", () => {
    const next = replay(startSimon(rng));
    expect(next.phase).toBe("showing");
    expect(next.sequence).toHaveLength(2);
    expect(roundsCompleted(next)).toBe(1);
  });

  it("NH-11: tracks progress inside a longer pattern", () => {
    const second = replay(startSimon(rng));
    const input = finishShowing(second);
    const [firstPad = 0] = input.sequence;
    const partial = pressPad(input, firstPad, rng);
    expect(partial.phase).toBe("input");
    expect(partial.inputIndex).toBe(1);
  });

  it("NH-11: the first mistake ends the game", () => {
    const input = finishShowing(startSimon(rng));
    const wrong: Pad = 0;
    const over = pressPad(input, wrong, rng);
    expect(over.phase).toBe("over");
    expect(roundsCompleted(over)).toBe(0);
    expect(pressPad(over, 2, rng)).toBe(over);
  });

  it("NH-11: finishing the last round wins", () => {
    let state = startSimon(rng);
    for (let round = 0; round < SIMON_MAX_ROUNDS; round += 1) {
      state = replay(state);
    }
    expect(state.phase).toBe("won");
    expect(roundsCompleted(state)).toBe(SIMON_MAX_ROUNDS);
  });

  it("NH-11: finishShowing only acts on the showing phase", () => {
    const over: SimonState = { phase: "over", sequence: [1], inputIndex: 0 };
    expect(finishShowing(over)).toBe(over);
  });
});
