import { describe, expect, it } from "vitest";
import { makePair, makeProgress } from "../../tests/factories";
import {
  applyResult,
  countDue,
  createProgress,
  INTERVALS_MS,
  isDue,
} from "./spacedRepetition";

const NOW = 1_000_000;

describe("applyResult", () => {
  it("FR-TRN-4: promotes a correct answer and schedules by the new box interval", () => {
    const next = applyResult(
      makeProgress({ box: 2, streak: 1 }),
      "correct",
      NOW,
    );
    expect(next).toMatchObject({
      box: 3,
      streak: 2,
      correct: 1,
      wrong: 0,
      lastSeenAt: NOW,
      dueAt: NOW + INTERVALS_MS[3],
    });
  });

  it("moves new words to box 1 when answered correctly", () => {
    expect(applyResult(createProgress(makePair()), "correct", NOW).box).toBe(1);
  });

  it("caps promotion at box 5", () => {
    const next = applyResult(makeProgress({ box: 5 }), "correct", NOW);
    expect(next.box).toBe(5);
    expect(next.dueAt).toBe(NOW + INTERVALS_MS[5]);
  });

  it.each([
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 3],
  ] as const)("demotes a wrong answer in box %i to box %i", (box, expected) => {
    const next = applyResult(makeProgress({ box, streak: 4 }), "wrong", NOW);
    expect(next.box).toBe(expected);
    expect(next.streak).toBe(0);
    expect(next.wrong).toBe(1);
    expect(next.dueAt).toBe(NOW + INTERVALS_MS[expected]);
  });

  it.each([
    [0, 1],
    [1, 1],
    [3, 3],
    [5, 5],
  ] as const)(
    "keeps box for an assisted answer in box %i (new words enter box 1)",
    (box, expected) => {
      const next = applyResult(
        makeProgress({ box, streak: 3 }),
        "assisted",
        NOW,
      );
      expect(next).toMatchObject({
        box: expected,
        streak: 0,
        correct: 0,
        wrong: 0,
        dueAt: NOW + INTERVALS_MS[expected],
      });
    },
  );

  it("does not mutate the input", () => {
    const progress = makeProgress({ box: 2 });
    applyResult(progress, "correct", NOW);
    expect(progress.box).toBe(2);
  });
});

describe("createProgress", () => {
  it("creates a new, immediately due, unseen record", () => {
    const pair = makePair({ id: "p", setId: "s" });
    expect(createProgress(pair)).toEqual({
      pairId: "p",
      setId: "s",
      box: 0,
      dueAt: 0,
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      streak: 0,
    });
  });
});

describe("isDue and countDue", () => {
  it("treats seen words as due once dueAt has passed", () => {
    expect(isDue(makeProgress({ box: 2, dueAt: NOW }), NOW)).toBe(true);
    expect(isDue(makeProgress({ box: 2, dueAt: NOW + 1 }), NOW)).toBe(false);
  });

  it("does not count new words as due", () => {
    expect(isDue(makeProgress({ box: 0, dueAt: 0 }), NOW)).toBe(false);
  });

  it("FR-ST-1: counts due words", () => {
    const records = [
      makeProgress({ box: 1, dueAt: 0 }),
      makeProgress({ box: 3, dueAt: NOW + 5 }),
      makeProgress({ box: 0 }),
      makeProgress({ box: 4, dueAt: NOW - 5 }),
    ];
    expect(countDue(records, NOW)).toBe(2);
    expect(countDue([], NOW)).toBe(0);
  });
});
