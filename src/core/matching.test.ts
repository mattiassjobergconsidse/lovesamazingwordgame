import { describe, expect, it } from "vitest";
import { makePair, makeRng } from "../../tests/factories";
import type { AnswerResult } from "../types";
import {
  attemptMatch,
  buildMatchingRound,
  buildMatchingRounds,
} from "./matching";

function makePairs(count: number) {
  return Array.from({ length: count }, () => makePair());
}

describe("buildMatchingRounds", () => {
  it.each([
    [0, []],
    [2, [2]],
    [6, [6]],
    [7, [7]],
    [8, [6, 2]],
    [12, [6, 6]],
    [13, [6, 7]],
    [14, [6, 6, 2]],
    [19, [6, 6, 7]],
  ])("FR-MT-4: %i pairs form rounds of sizes %j", (count, sizes) => {
    const rounds = buildMatchingRounds(makePairs(count));
    expect(rounds.map((round) => round.length)).toEqual(sizes);
  });

  it("FR-MT-3: keeps every pair exactly once in session order", () => {
    const pairs = makePairs(13);
    expect(buildMatchingRounds(pairs).flat()).toEqual(pairs);
  });

  it("keeps a lone pair as its own round when nothing precedes it", () => {
    expect(buildMatchingRounds(makePairs(1))).toHaveLength(1);
  });
});

describe("buildMatchingRound", () => {
  it("FR-MT-1: both columns contain every pair once", () => {
    const pairs = makePairs(6);
    const round = buildMatchingRound(pairs, makeRng(1));
    const expected = pairs.map((pair) => pair.id).sort();
    expect(round.left.map((item) => item.pairId).sort()).toEqual(expected);
    expect(round.right.map((item) => item.pairId).sort()).toEqual(expected);
  });

  it("FR-MT-1: language A is on the left unless the round is swapped", () => {
    const pairs = makePairs(4);
    for (let seed = 0; seed < 10; seed += 1) {
      const round = buildMatchingRound(pairs, makeRng(seed));
      const leftPrefix = round.swapped ? "word" : "ord";
      const rightPrefix = round.swapped ? "ord" : "word";
      expect(round.left.every((item) => item.text.startsWith(leftPrefix))).toBe(
        true,
      );
      expect(
        round.right.every((item) => item.text.startsWith(rightPrefix)),
      ).toBe(true);
    }
  });

  it("FR-MT-1: swaps the column order in some rounds", () => {
    const pairs = makePairs(4);
    const swaps = new Set(
      Array.from(
        { length: 20 },
        (_, seed) => buildMatchingRound(pairs, makeRng(seed)).swapped,
      ),
    );
    expect(swaps).toEqual(new Set([true, false]));
  });

  it("shuffles the columns independently", () => {
    const pairs = makePairs(8);
    const different = Array.from({ length: 10 }, (_, seed) => {
      const round = buildMatchingRound(pairs, makeRng(seed));
      return (
        round.left.map((item) => item.pairId).join() !==
        round.right.map((item) => item.pairId).join()
      );
    });
    expect(different).toContain(true);
  });
});

describe("attemptMatch", () => {
  const round = buildMatchingRound(makePairs(3), makeRng(4));
  const [one, two] = round.left;
  const matchOf = (pairId: string) =>
    round.right.find((item) => item.pairId === pairId);

  it("FR-MT-3: a first-try match is correct", () => {
    if (one === undefined) throw new Error("empty round");
    const right = matchOf(one.pairId);
    if (right === undefined) throw new Error("missing match");
    const attempt = attemptMatch(one, right, new Map());
    expect(attempt.isMatch).toBe(true);
    expect(attempt.results.get(one.pairId)).toBe("correct");
  });

  it("FR-MT-2: a wrong attempt marks both words wrong", () => {
    if (one === undefined || two === undefined) throw new Error("empty round");
    const right = matchOf(two.pairId);
    if (right === undefined) throw new Error("missing match");
    const attempt = attemptMatch(one, right, new Map());
    expect(attempt.isMatch).toBe(false);
    expect(attempt.results.get(one.pairId)).toBe("wrong");
    expect(attempt.results.get(two.pairId)).toBe("wrong");
  });

  it("FR-MT-3: only the first attempt per word counts", () => {
    if (one === undefined || two === undefined) throw new Error("empty round");
    const right = matchOf(one.pairId);
    const wrongRight = matchOf(two.pairId);
    if (right === undefined || wrongRight === undefined)
      throw new Error("missing match");

    const afterWrong = attemptMatch(one, wrongRight, new Map());
    const afterRetry = attemptMatch(one, right, afterWrong.results);
    expect(afterRetry.isMatch).toBe(true);
    expect(afterRetry.results.get(one.pairId)).toBe("wrong");
  });

  it("does not mutate the previous results", () => {
    if (one === undefined || two === undefined) throw new Error("empty round");
    const right = matchOf(two.pairId);
    if (right === undefined) throw new Error("missing match");
    const before = new Map<string, AnswerResult>();
    attemptMatch(one, right, before);
    expect(before.size).toBe(0);
  });
});
