import { describe, expect, it } from "vitest";
import {
  comboMultiplier,
  isNewBest,
  MAX_MULTIPLIER,
  POINTS_PER_CORRECT,
  remainingMs,
  scoreSpeedRound,
  SPEED_ROUND_MS,
} from "./speedRound";

describe("comboMultiplier", () => {
  it("NH-16: starts at x1 and rises by one every third correct answer", () => {
    expect([0, 1, 2, 3, 5, 6].map(comboMultiplier)).toEqual([1, 1, 1, 2, 2, 3]);
  });

  it("NH-16: is capped", () => {
    expect(comboMultiplier(1000)).toBe(MAX_MULTIPLIER);
  });

  it("treats a negative combo as no combo", () => {
    expect(comboMultiplier(-4)).toBe(1);
  });
});

describe("scoreSpeedRound", () => {
  it("NH-16: scores nothing without answers", () => {
    expect(scoreSpeedRound([])).toEqual({
      score: 0,
      combo: 0,
      bestCombo: 0,
      correct: 0,
    });
  });

  it("NH-16: multiplies points by the combo reached before the answer", () => {
    const answers = Array.from({ length: 4 }, () => "correct" as const);

    const { score, combo } = scoreSpeedRound(answers);

    // Three answers at x1, the fourth at x2.
    expect(score).toBe(POINTS_PER_CORRECT * (3 + 2));
    expect(combo).toBe(4);
  });

  it("NH-16: a wrong answer resets the combo but keeps the best run", () => {
    const result = scoreSpeedRound(["correct", "correct", "wrong", "correct"]);

    expect(result).toEqual({
      score: POINTS_PER_CORRECT * 3,
      combo: 1,
      bestCombo: 2,
      correct: 3,
    });
  });

  it("NH-16: an assisted answer earns nothing and resets the combo", () => {
    const result = scoreSpeedRound(["correct", "assisted"]);

    expect(result.score).toBe(POINTS_PER_CORRECT);
    expect(result.combo).toBe(0);
  });
});

describe("remainingMs", () => {
  it("NH-16: counts down from the full round", () => {
    expect(remainingMs(1000, 1000)).toBe(SPEED_ROUND_MS);
    expect(remainingMs(1000, 11_000)).toBe(SPEED_ROUND_MS - 10_000);
  });

  it("NH-16: never goes below zero", () => {
    expect(remainingMs(0, SPEED_ROUND_MS + 5000)).toBe(0);
  });
});

describe("isNewBest", () => {
  it("NH-16: the first positive score is a best", () => {
    expect(isNewBest(10, null)).toBe(true);
  });

  it("NH-16: only a higher score beats the stored one", () => {
    expect(isNewBest(50, 40)).toBe(true);
    expect(isNewBest(40, 40)).toBe(false);
    expect(isNewBest(30, 40)).toBe(false);
  });

  it("NH-16: a score of zero is never a best", () => {
    expect(isNewBest(0, null)).toBe(false);
  });
});
