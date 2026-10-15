import { describe, expect, it } from "vitest";
import { makePair } from "../../tests/factories";
import { filterPairs } from "./filterPairs";

const pairs = [
  makePair({ id: "1", a: "hund", b: "dog" }),
  makePair({ id: "2", a: "stor", b: "big", altB: ["Large"] }),
  makePair({ id: "3", a: "häst", b: "horse" }),
];

describe("filterPairs", () => {
  it("FR-SET-9: returns everything for a blank query", () => {
    expect(filterPairs(pairs, "  ")).toBe(pairs);
  });

  it("FR-SET-9: matches either language, case-insensitively", () => {
    expect(filterPairs(pairs, "DOG").map((p) => p.id)).toEqual(["1"]);
    expect(filterPairs(pairs, "stor").map((p) => p.id)).toEqual(["2"]);
  });

  it("FR-SET-9: matches alternative answers", () => {
    expect(filterPairs(pairs, "larg").map((p) => p.id)).toEqual(["2"]);
  });

  it("FR-SET-9: keeps accents significant and finds Swedish characters", () => {
    expect(filterPairs(pairs, "häst").map((p) => p.id)).toEqual(["3"]);
    expect(filterPairs(pairs, "hast")).toEqual([]);
  });

  it("FR-SET-9: returns an empty list when nothing matches", () => {
    expect(filterPairs(pairs, "zebra")).toEqual([]);
  });
});
