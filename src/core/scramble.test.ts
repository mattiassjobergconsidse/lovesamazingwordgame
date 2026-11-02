import { describe, expect, it } from "vitest";
import {
  applyHint,
  createScramble,
  giveUp,
  isFullButWrong,
  placeLetter,
  placeTile,
  removeLastTile,
  removeTile,
  scrambleResult,
  scrambleSlots,
  scrambleStatus,
  shuffleLetters,
  type ScrambleState,
} from "./scramble";

/** Deterministic rng that cycles through the given values. */
function sequence(...values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

function typeAll(state: ScrambleState, letters: string): ScrambleState {
  return Array.from(letters).reduce(placeLetter, state);
}

describe("shuffleLetters", () => {
  it("NH-13: keeps the same letters", () => {
    const result = shuffleLetters(Array.from("house"), sequence(0.3, 0.7));

    expect([...result].sort()).toEqual(Array.from("house").sort());
  });

  it("NH-13: never returns the original order when two distinct letters exist", () => {
    // rng 0.999 keeps every element in place with Fisher-Yates, i.e. the original order.
    const letters = Array.from("abc");

    const result = shuffleLetters(letters, () => 0.999);

    expect(result).not.toEqual(letters);
    expect([...result].sort()).toEqual(letters);
  });

  it("NH-13: handles answers where the order cannot change", () => {
    expect(shuffleLetters(Array.from("aaa"), () => 0.5)).toEqual(
      Array.from("aaa"),
    );
    expect(shuffleLetters(["x"], () => 0.5)).toEqual(["x"]);
    expect(shuffleLetters([], () => 0.5)).toEqual([]);
  });

  it("NH-13: does not mutate its input", () => {
    const letters = Array.from("abc");

    shuffleLetters(letters, () => 0.1);

    expect(letters).toEqual(Array.from("abc"));
  });
});

describe("scramble round", () => {
  it("NH-13: starts playing with shuffled lower-case tiles and nothing placed", () => {
    const state = createScramble("House", () => 0.999);

    expect(scrambleStatus(state)).toBe("playing");
    expect(state.placed).toEqual([]);
    expect([...state.tiles].sort()).toEqual(Array.from("house").sort());
    expect(state.tiles.join("")).not.toBe("house");
  });

  it("NH-13: places typed letters, case-insensitively, until the word is solved", () => {
    const state = typeAll(
      createScramble("Hus", () => 0.999),
      "HUS",
    );

    expect(scrambleStatus(state)).toBe("solved");
    expect(scrambleResult(state)).toBe("correct");
  });

  it("NH-13: ignores typed letters that have no free tile and non-letters", () => {
    const start = createScramble("hus", () => 0.999);

    expect(placeLetter(start, "z")).toBe(start);
    expect(placeLetter(start, "1")).toBe(start);
    expect(placeLetter(start, "ab")).toBe(start);
    const once = placeLetter(start, "h");
    expect(placeLetter(once, "h")).toBe(once);
  });

  it("NH-13: uses duplicate letters one tile at a time", () => {
    const state = typeAll(
      createScramble("noon", () => 0.999),
      "noon",
    );

    expect(scrambleStatus(state)).toBe("solved");
  });

  it("NH-13: keeps å, ä and ö distinct from a and o", () => {
    const start = createScramble("smör", () => 0.999);

    expect(placeLetter(start, "o")).toBe(start);
    expect(scrambleStatus(typeAll(start, "SMÖR"))).toBe("solved");
  });

  it("NH-13: places a tile by index and ignores used or unknown tiles", () => {
    const start = createScramble("hus", () => 0.999);
    const once = placeTile(start, 0);

    expect(once.placed).toEqual([0]);
    expect(placeTile(once, 0)).toBe(once);
    expect(placeTile(start, 3)).toBe(start);
    expect(placeTile(start, -1)).toBe(start);
  });

  it("NH-13: a full row in the wrong order stays playing and can be corrected", () => {
    const start = createScramble("ab", () => 0.999);
    const wrong = typeAll(start, "ba");

    expect(scrambleStatus(wrong)).toBe("playing");
    expect(isFullButWrong(wrong)).toBe(true);
    expect(placeLetter(wrong, "a")).toBe(wrong);
    const fixed = typeAll(removeLastTile(removeLastTile(wrong)), "ab");
    expect(scrambleStatus(fixed)).toBe("solved");
    expect(isFullButWrong(fixed)).toBe(false);
  });

  it("NH-13: removing a placed tile shifts the later ones left", () => {
    const state = typeAll(
      createScramble("hus", () => 0.999),
      "hus",
    );
    const hTile = state.placed[0] ?? -1;
    const afterSolved = removeTile(state, hTile);
    expect(afterSolved).toBe(state);

    const partial = typeAll(
      createScramble("hus", () => 0.999),
      "hu",
    );
    const removed = removeTile(partial, partial.placed[0] ?? -1);

    expect(removed.placed).toHaveLength(1);
    expect(scrambleSlots(removed)[0]).toMatchObject({ char: "u" });
  });

  it("NH-13: removeLastTile removes the newest tile and is a no-op when empty", () => {
    const start = createScramble("hus", () => 0.999);
    const two = typeAll(start, "hu");

    expect(removeLastTile(two).placed).toEqual(two.placed.slice(0, 1));
    expect(removeLastTile(start)).toBe(start);
  });

  it("NH-13: an answer without letters is solved immediately", () => {
    const state = createScramble("42", () => 0.5);

    expect(scrambleStatus(state)).toBe("solved");
    expect(scrambleResult(state)).toBe("correct");
  });
});

describe("scramble hint and give up", () => {
  it("NH-13: a hint places the next correct letter and makes the result assisted", () => {
    const start = createScramble("hus", () => 0.999);

    const hinted = applyHint(start);

    expect(scrambleSlots(hinted)[0]).toMatchObject({ char: "h" });
    expect(hinted.hinted).toBe(true);
    const solved = typeAll(hinted, "us");
    expect(scrambleResult(solved)).toBe("assisted");
  });

  it("NH-13: a hint first removes wrongly placed letters", () => {
    const start = createScramble("hus", () => 0.999);
    const wrong = typeAll(start, "uh");

    const hinted = applyHint(wrong);

    expect(scrambleSlots(hinted).map((slot) => slot.char)).toEqual([
      "h",
      "",
      "",
    ]);
  });

  it("NH-13: keeps correct letters when hinting and can solve the word", () => {
    let state = createScramble("hus", () => 0.999);
    state = applyHint(applyHint(applyHint(state)));

    expect(scrambleStatus(state)).toBe("solved");
    expect(scrambleResult(state)).toBe("assisted");
    expect(applyHint(state)).toBe(state);
  });

  it("NH-13: giving up reveals the answer and the result is wrong", () => {
    const state = giveUp(
      typeAll(
        createScramble("Hus", () => 0.999),
        "u",
      ),
    );

    expect(scrambleStatus(state)).toBe("gaveUp");
    expect(scrambleResult(state)).toBe("wrong");
    expect(scrambleSlots(state).map((slot) => slot.char)).toEqual([
      "H",
      "u",
      "s",
    ]);
    expect(placeLetter(state, "h")).toBe(state);
    expect(applyHint(state)).toBe(state);
  });

  it("NH-13: giving up after solving changes nothing", () => {
    const solved = typeAll(
      createScramble("hus", () => 0.999),
      "hus",
    );

    expect(giveUp(solved)).toBe(solved);
  });

  it("NH-13: has no result while playing", () => {
    expect(scrambleResult(createScramble("hus", () => 0.999))).toBeNull();
  });
});

describe("scramble slots", () => {
  it("NH-13: keeps spaces and hyphens fixed so word boundaries stay visible", () => {
    const state = typeAll(
      createScramble("ice-cream now", () => 0.999),
      "ic",
    );
    const slots = scrambleSlots(state);

    expect(slots.map((slot) => slot.isLetter)).toEqual([
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      true,
    ]);
    expect(slots[3]?.char).toBe("-");
    expect(slots[9]?.char).toBe(" ");
    expect(state.tiles).toHaveLength(11);
  });

  it("NH-13: shows the original casing once the round is solved", () => {
    const state = typeAll(
      createScramble("Hus", () => 0.999),
      "hus",
    );

    expect(scrambleSlots(state).map((slot) => slot.char)).toEqual([
      "H",
      "u",
      "s",
    ]);
  });
});
