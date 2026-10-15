import { describe, expect, it } from "vitest";
import { makePair } from "../../tests/factories";
import { acceptedAnswers, pickDirection, termsFor } from "./direction";

describe("pickDirection", () => {
  it("FR-TRN-3: returns a forced direction regardless of rng", () => {
    expect(pickDirection("AtoB", () => 0.99)).toBe("AtoB");
    expect(pickDirection("BtoA", () => 0)).toBe("BtoA");
  });

  it("FR-TRN-3: random mode picks either direction from rng", () => {
    expect(pickDirection("random", () => 0.1)).toBe("AtoB");
    expect(pickDirection("random", () => 0.9)).toBe("BtoA");
  });
});

describe("termsFor", () => {
  const pair = makePair({
    a: "stor",
    b: "big",
    altB: ["large"],
    altA: ["jätte"],
  });

  it("uses a as prompt and b as answer for AtoB", () => {
    expect(termsFor(pair, "AtoB")).toEqual({
      prompt: "stor",
      answer: "big",
      alternatives: ["large"],
    });
  });

  it("uses b as prompt and a as answer for BtoA", () => {
    expect(termsFor(pair, "BtoA")).toEqual({
      prompt: "big",
      answer: "stor",
      alternatives: ["jätte"],
    });
  });

  it("defaults to no alternatives", () => {
    expect(termsFor(makePair({ a: "x", b: "y" }), "AtoB").alternatives).toEqual(
      [],
    );
  });

  it("FR-SET-7: acceptedAnswers lists the main answer first", () => {
    expect(acceptedAnswers(termsFor(pair, "AtoB"))).toEqual(["big", "large"]);
  });
});
