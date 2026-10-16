import { describe, expect, it } from "vitest";
import { summariseResults, TONES, VIBRATIONS } from "./feedback";

describe("summariseResults", () => {
  it("NH-4: a round with a wrong answer is wrong", () => {
    expect(summariseResults(["correct", "wrong", "assisted"])).toBe("wrong");
  });

  it("NH-4: a round without wrong answers but with help is assisted", () => {
    expect(summariseResults(["correct", "assisted"])).toBe("assisted");
  });

  it("NH-4: a clean round is correct", () => {
    expect(summariseResults(["correct", "correct"])).toBe("correct");
  });
});

describe("feedback patterns", () => {
  it("NH-4: wrong sounds lower than correct and vibrates twice", () => {
    expect(TONES.wrong.frequency).toBeLessThan(TONES.correct.frequency);
    expect(VIBRATIONS.wrong).toHaveLength(3);
    expect(VIBRATIONS.correct).toHaveLength(1);
  });
});
