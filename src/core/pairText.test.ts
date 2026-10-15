import { describe, expect, it } from "vitest";
import { findDuplicatePairIds, formatTerms, parseTerms } from "./pairText";

describe("parseTerms", () => {
  it("FR-SET-7: splits alternatives on semicolons; the first value is the main term", () => {
    expect(parseTerms("big; large ;huge")).toEqual({
      main: "big",
      alternatives: ["large", "huge"],
    });
  });

  it("FR-SET-6: trims whitespace and keeps å, ä, ö and emoji", () => {
    expect(parseTerms("  ö 🙂  ")).toEqual({ main: "ö 🙂", alternatives: [] });
  });

  it("FR-SET-6: returns an empty main term for blank input", () => {
    expect(parseTerms("  ; ; ")).toEqual({ main: "", alternatives: [] });
    expect(parseTerms("")).toEqual({ main: "", alternatives: [] });
  });
});

describe("formatTerms", () => {
  it("FR-SET-7: round-trips with parseTerms", () => {
    expect(formatTerms("big", ["large", "huge"])).toBe("big; large; huge");
    expect(formatTerms("big", undefined)).toBe("big");
    expect(parseTerms(formatTerms("big", ["large"]))).toEqual({
      main: "big",
      alternatives: ["large"],
    });
  });
});

describe("findDuplicatePairIds", () => {
  it("FR-SET-6: reports later occurrences, case-insensitively", () => {
    const ids = findDuplicatePairIds([
      { id: "1", a: "Hund", b: "dog" },
      { id: "2", a: "katt", b: "cat" },
      { id: "3", a: "hund", b: "DOG" },
      { id: "4", a: "hund", b: "dog" },
    ]);

    expect([...ids]).toEqual(["3", "4"]);
  });

  it("FR-SET-6: treats different translations as different pairs", () => {
    expect(
      findDuplicatePairIds([
        { id: "1", a: "bank", b: "bank" },
        { id: "2", a: "bank", b: "bench" },
      ]).size,
    ).toBe(0);
  });
});
