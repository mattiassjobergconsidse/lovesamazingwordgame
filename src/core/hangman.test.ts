import { describe, expect, it } from "vitest";
import {
  MAX_WRONG_GUESSES,
  answerSlots,
  createHangman,
  guessLetter,
  hangmanStatus,
  keyboardLetters,
  wrongGuesses,
  type HangmanState,
} from "./hangman";

function guessAll(state: HangmanState, letters: string): HangmanState {
  return Array.from(letters).reduce(guessLetter, state);
}

describe("hangman", () => {
  it("NH-9: starts a round that is playing with nothing guessed", () => {
    const state = createHangman("hus");

    expect(hangmanStatus(state)).toBe("playing");
    expect(state.guessed).toEqual([]);
    expect(answerSlots(state).every((slot) => !slot.revealed)).toBe(true);
  });

  it("NH-9: reveals every occurrence of a correct letter, case-insensitively", () => {
    const state = guessLetter(createHangman("Banana"), "A");

    expect(answerSlots(state).map((slot) => slot.revealed)).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
    expect(wrongGuesses(state)).toEqual([]);
  });

  it("NH-9: treats accented letters as different letters", () => {
    const state = guessLetter(createHangman("smör"), "o");

    expect(wrongGuesses(state)).toEqual(["o"]);
    expect(wrongGuesses(guessLetter(createHangman("smör"), "ö"))).toEqual([]);
  });

  it("NH-9: handles å, ä and ö in uppercase", () => {
    const state = guessAll(createHangman("Äpple på ö"), "ÄÅÖ");

    expect(answerSlots(state)[0]?.revealed).toBe(true);
    expect(wrongGuesses(state)).toEqual([]);
  });

  it("NH-9: never hides spaces, hyphens or digits", () => {
    const slots = answerSlots(createHangman("ice-cream 2"));

    expect(
      slots.filter((slot) => !slot.isLetter).map((slot) => slot.char),
    ).toEqual(["-", " ", "2"]);
    expect(
      slots.filter((slot) => !slot.isLetter).every((s) => s.revealed),
    ).toBe(true);
  });

  it("NH-9: is won when all letters are guessed", () => {
    expect(hangmanStatus(guessAll(createHangman("hus"), "hus"))).toBe("won");
  });

  it("NH-9: is won immediately when the answer has no letters", () => {
    expect(hangmanStatus(createHangman("42"))).toBe("won");
  });

  it(`NH-9: is lost after ${String(MAX_WRONG_GUESSES)} wrong guesses`, () => {
    const almost = guessAll(createHangman("hus"), "qwxzj");
    expect(hangmanStatus(almost)).toBe("playing");

    expect(hangmanStatus(guessLetter(almost, "k"))).toBe("lost");
  });

  it("NH-9: ignores repeated, non-letter and late guesses", () => {
    const once = guessLetter(createHangman("hus"), "q");

    expect(guessLetter(once, "Q")).toBe(once);
    expect(guessLetter(once, "1")).toBe(once);
    expect(guessLetter(once, "ab")).toBe(once);
    const lost = guessAll(createHangman("hus"), "qwxzjk");
    expect(guessLetter(lost, "h")).toBe(lost);
  });

  it("NH-9: reveals the whole word on request", () => {
    expect(
      answerSlots(createHangman("hus"), true).every((slot) => slot.revealed),
    ).toBe(true);
  });

  it("NH-9: keyboard has a-z, å, ä, ö and extra letters from the answer", () => {
    const letters = keyboardLetters("café");

    expect(letters).toHaveLength(26 + 3 + 1);
    expect(letters).toContain("å");
    expect(letters.at(-1)).toBe("é");
    expect(keyboardLetters("hus")).toHaveLength(29);
  });
});
