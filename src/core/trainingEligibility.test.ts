import { describe, expect, it } from "vitest";
import { isModeAvailable } from "./trainingEligibility";

describe("isModeAvailable", () => {
  it.each([
    ["flashcards", 0, false],
    ["flashcards", 1, true],
    ["writing", 0, false],
    ["writing", 1, true],
    ["quiz", 1, false],
    ["quiz", 2, true],
    ["matching", 1, false],
    ["matching", 2, true],
    ["hangman", 0, false],
    ["hangman", 1, true],
  ] as const)("FR-ACT-1: %s with %i words is %s", (mode, count, expected) => {
    expect(isModeAvailable(mode, count)).toBe(expected);
  });
});
