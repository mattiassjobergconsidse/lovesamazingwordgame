import { describe, expect, it } from "vitest";
import { makePair, makeRng } from "../../tests/factories";
import {
  buildTrueFalseProposal,
  judgeProposal,
  judgementForKey,
  judgementFromSwipe,
  type TrueFalseProposal,
} from "./trueFalse";

function makePool(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makePair({ a: `ord${String(index)}`, b: `word${String(index)}` }),
  );
}

/** An rng that always returns `value`; the first draw decides true or false. */
function constantRng(value: number) {
  return () => value;
}

describe("buildTrueFalseProposal", () => {
  it("NH-17: shows the real translation when the draw says true", () => {
    const pool = makePool(5);
    const target = pool[0];
    if (target === undefined) throw new Error("empty pool");

    const proposal = buildTrueFalseProposal(
      target,
      pool,
      "AtoB",
      constantRng(0.1),
    );

    expect(proposal).toMatchObject({
      prompt: target.a,
      proposed: target.b,
      correctAnswer: target.b,
      isTrue: true,
    });
  });

  it("NH-17: shows a translation of another word when the draw says false", () => {
    const pool = makePool(5);
    const target = pool[0];
    if (target === undefined) throw new Error("empty pool");

    const proposal = buildTrueFalseProposal(
      target,
      pool,
      "AtoB",
      constantRng(0.9),
    );

    expect(proposal.isTrue).toBe(false);
    expect(proposal.proposed).not.toBe(target.b);
    expect(pool.map((pair) => pair.b)).toContain(proposal.proposed);
    expect(proposal.correctAnswer).toBe(target.b);
  });

  it("NH-17: uses the answer side of the chosen direction", () => {
    const pool = makePool(5);
    const target = pool[1];
    if (target === undefined) throw new Error("empty pool");

    const proposal = buildTrueFalseProposal(
      target,
      pool,
      "BtoA",
      constantRng(0.1),
    );

    expect(proposal.prompt).toBe(target.b);
    expect(proposal.proposed).toBe(target.a);
  });

  it("NH-17: about half of the proposals are true", () => {
    const pool = makePool(8);
    const target = pool[0];
    if (target === undefined) throw new Error("empty pool");
    let trueCount = 0;
    const runs = 200;

    for (let seed = 0; seed < runs; seed += 1) {
      if (buildTrueFalseProposal(target, pool, "AtoB", makeRng(seed)).isTrue) {
        trueCount += 1;
      }
    }

    expect(trueCount).toBeGreaterThan(runs * 0.35);
    expect(trueCount).toBeLessThan(runs * 0.65);
  });

  it("NH-17: a false proposal never equals the answer or its alternatives", () => {
    const target = makePair({ a: "stor", b: "big", altB: ["large"] });
    const pool = [
      target,
      makePair({ a: "a1", b: "Large" }),
      makePair({ a: "a2", b: "BIG " }),
      makePair({ a: "a3", b: "small" }),
    ];

    for (let seed = 0; seed < 20; seed += 1) {
      const proposal = buildTrueFalseProposal(
        target,
        pool,
        "AtoB",
        constantRng(0.9),
      );
      expect(proposal.proposed).toBe("small");
    }
  });

  it("NH-17: falls back to the real translation when no distractor exists", () => {
    const target = makePair({ a: "x", b: "same" });
    const other = makePair({ a: "y", b: "Same" });

    const proposal = buildTrueFalseProposal(
      target,
      [target, other],
      "AtoB",
      constantRng(0.9),
    );

    expect(proposal.isTrue).toBe(true);
    expect(proposal.proposed).toBe("same");
  });

  it("is deterministic for the same seed", () => {
    const pool = makePool(8);
    const target = pool[0];
    if (target === undefined) throw new Error("empty pool");

    expect(buildTrueFalseProposal(target, pool, "AtoB", makeRng(4))).toEqual(
      buildTrueFalseProposal(target, pool, "AtoB", makeRng(4)),
    );
  });
});

describe("judgeProposal", () => {
  const base: Omit<TrueFalseProposal, "isTrue"> = {
    pairId: "p",
    direction: "AtoB",
    prompt: "hus",
    proposed: "house",
    correctAnswer: "house",
  };

  it.each([
    [true, true, "correct"],
    [true, false, "wrong"],
    [false, false, "correct"],
    [false, true, "wrong"],
  ] as const)(
    "NH-17: proposal true=%s judged true=%s is %s",
    (isTrue, judgedTrue, expected) => {
      expect(judgeProposal({ ...base, isTrue }, judgedTrue)).toBe(expected);
    },
  );
});

describe("judgementForKey", () => {
  it.each([
    ["ArrowRight", true],
    ["t", true],
    ["T", true],
    ["ArrowLeft", false],
    ["f", false],
    ["F", false],
    ["a", null],
    [" ", null],
    ["Enter", null],
  ] as const)("NH-17: maps %j to %s", (key, expected) => {
    expect(judgementForKey(key)).toBe(expected);
  });
});

describe("judgementFromSwipe", () => {
  it("NH-17: right is true, left is false", () => {
    expect(judgementFromSwipe(120, 5)).toBe(true);
    expect(judgementFromSwipe(-120, -5)).toBe(false);
  });

  it("NH-17: ignores short and mostly vertical movements", () => {
    expect(judgementFromSwipe(20, 0)).toBeNull();
    expect(judgementFromSwipe(70, 200)).toBeNull();
  });
});
