import { describe, expect, it } from "vitest";
import { summarizeSet } from "./setSummary";

describe("summarizeSet", () => {
  it("FR-SET-5: counts words, due words and the latest practice time", () => {
    const summary = summarizeSet(
      [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }],
      [
        { pairId: "1", dueAt: 50, lastSeenAt: 10 },
        { pairId: "2", dueAt: 500, lastSeenAt: 90 },
        { pairId: "3", dueAt: 100, lastSeenAt: null },
      ],
      100,
    );

    // 1 and 3 are due; 4 is new and therefore due; 2 is not due yet.
    expect(summary).toEqual({
      wordCount: 4,
      dueCount: 3,
      lastPractisedAt: 90,
    });
  });

  it("FR-SET-5: handles an empty set", () => {
    expect(summarizeSet([], [], 0)).toEqual({
      wordCount: 0,
      dueCount: 0,
      lastPractisedAt: null,
    });
  });
});
