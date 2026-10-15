import { describe, expect, it } from "vitest";
import { makeRng } from "../../tests/factories";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("FR-TRN-2: keeps every item exactly once", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(items, makeRng(1)).sort()).toEqual(items);
  });

  it("does not mutate the input", () => {
    const items = [1, 2, 3, 4];
    shuffle(items, makeRng(2));
    expect(items).toEqual([1, 2, 3, 4]);
  });

  it("is deterministic for the same seed", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(shuffle(items, makeRng(7))).toEqual(shuffle(items, makeRng(7)));
  });

  it("produces different orders for different seeds", () => {
    const items = Array.from({ length: 20 }, (_, index) => index);
    expect(shuffle(items, makeRng(1))).not.toEqual(shuffle(items, makeRng(2)));
  });

  it("handles empty and single-item arrays", () => {
    expect(shuffle([], makeRng(1))).toEqual([]);
    expect(shuffle(["x"], makeRng(1))).toEqual(["x"]);
  });
});
