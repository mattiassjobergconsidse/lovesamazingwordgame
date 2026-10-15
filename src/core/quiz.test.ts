import { describe, expect, it } from "vitest";
import { makePair, makeRng } from "../../tests/factories";
import { buildQuizQuestion } from "./quiz";

function makePool(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makePair({ a: `ord${String(index)}`, b: `word${String(index)}` }),
  );
}

describe("buildQuizQuestion", () => {
  it("FR-QZ-1: offers 4 unique options including the correct answer", () => {
    const pool = makePool(10);
    const target = pool[0];
    if (target === undefined) throw new Error("empty pool");

    const question = buildQuizQuestion(target, pool, "AtoB", makeRng(1));

    expect(question.prompt).toBe(target.a);
    expect(question.options).toHaveLength(4);
    expect(new Set(question.options).size).toBe(4);
    expect(question.options[question.correctIndex]).toBe(target.b);
  });

  it("FR-QZ-1: uses the answer side of the chosen direction", () => {
    const pool = makePool(5);
    const target = pool[1];
    if (target === undefined) throw new Error("empty pool");

    const question = buildQuizQuestion(target, pool, "BtoA", makeRng(2));

    expect(question.prompt).toBe(target.b);
    expect(question.options[question.correctIndex]).toBe(target.a);
    expect(question.options.every((option) => option.startsWith("ord"))).toBe(
      true,
    );
  });

  it("FR-QZ-3: uses as many options as there are pairs for small sets", () => {
    for (const size of [2, 3]) {
      const pool = makePool(size);
      const target = pool[0];
      if (target === undefined) throw new Error("empty pool");
      expect(
        buildQuizQuestion(target, pool, "AtoB", makeRng(size)).options,
      ).toHaveLength(size);
    }
  });

  it("FR-QZ-1: distractors never equal the answer, its alternatives, or each other", () => {
    const target = makePair({ a: "stor", b: "big", altB: ["large"] });
    const pool = [
      target,
      makePair({ a: "a1", b: "Large" }),
      makePair({ a: "a2", b: "BIG " }),
      makePair({ a: "a3", b: "small" }),
      makePair({ a: "a4", b: "Small" }),
      makePair({ a: "a5", b: "tiny" }),
    ];

    for (let seed = 0; seed < 20; seed += 1) {
      const { options } = buildQuizQuestion(
        target,
        pool,
        "AtoB",
        makeRng(seed),
      );
      const lowered = options.map((option) => option.trim().toLowerCase());
      expect(new Set(lowered).size).toBe(lowered.length);
      expect(lowered.filter((option) => option === "big")).toHaveLength(1);
      expect(lowered).not.toContain("large");
    }
  });

  it("returns only the correct answer when no distractor is available", () => {
    const target = makePair({ a: "x", b: "same" });
    const other = makePair({ a: "y", b: "Same" });
    const question = buildQuizQuestion(
      target,
      [target, other],
      "AtoB",
      makeRng(1),
    );
    expect(question.options).toEqual(["same"]);
    expect(question.correctIndex).toBe(0);
  });

  it("shuffles the position of the correct answer", () => {
    const pool = makePool(8);
    const target = pool[0];
    if (target === undefined) throw new Error("empty pool");
    const positions = new Set<number>();
    for (let seed = 0; seed < 30; seed += 1) {
      positions.add(
        buildQuizQuestion(target, pool, "AtoB", makeRng(seed)).correctIndex,
      );
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("is deterministic for the same seed", () => {
    const pool = makePool(8);
    const target = pool[0];
    if (target === undefined) throw new Error("empty pool");
    expect(buildQuizQuestion(target, pool, "AtoB", makeRng(9))).toEqual(
      buildQuizQuestion(target, pool, "AtoB", makeRng(9)),
    );
  });
});
