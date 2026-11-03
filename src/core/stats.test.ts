import { describe, expect, it } from "vitest";
import { makePair, makeProgress } from "../../tests/factories";
import type { AnswerResult, DailyActivity, WordPair } from "../types";
import {
  computeSetStats,
  hardestWords,
  lastSessionMistakes,
  practiceStreak,
  recentActivity,
  SESSION_GAP_MS,
  shiftDateKey,
} from "./stats";

const NOW = new Date(2026, 9, 16, 12, 0).getTime();

function day(date: string, answered: number, correct: number): DailyActivity {
  return { id: `set-1:${date}`, setId: "set-1", date, answered, correct };
}

describe("shiftDateKey", () => {
  it("moves across month and year boundaries", () => {
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDateKey("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("practiceStreak", () => {
  it("FR-ST-1: is zero without activity", () => {
    expect(practiceStreak([], NOW)).toBe(0);
  });

  it("FR-ST-1: counts consecutive days including today", () => {
    const activity = [
      day("2026-10-16", 3, 3),
      day("2026-10-15", 2, 1),
      day("2026-10-14", 1, 1),
    ];
    expect(practiceStreak(activity, NOW)).toBe(3);
  });

  it("FR-ST-1: keeps the streak alive when only today is still empty", () => {
    const activity = [day("2026-10-15", 2, 1), day("2026-10-14", 1, 1)];
    expect(practiceStreak(activity, NOW)).toBe(2);
  });

  it("FR-ST-1: breaks on a missed day", () => {
    const activity = [day("2026-10-16", 1, 1), day("2026-10-14", 1, 1)];
    expect(practiceStreak(activity, NOW)).toBe(1);
  });

  it("FR-ST-1: is zero when the last practice was before yesterday", () => {
    expect(practiceStreak([day("2026-10-13", 5, 5)], NOW)).toBe(0);
  });

  it("FR-ST-1: ignores records without answers", () => {
    expect(practiceStreak([day("2026-10-16", 0, 0)], NOW)).toBe(0);
  });
});

describe("computeSetStats", () => {
  const pairs = ["p1", "p2", "p3", "p4", "p5"].map((id) => makePair({ id }));

  it("FR-ST-1: counts new, learning, mastered and due words", () => {
    const progress = [
      makeProgress({ pairId: "p1", box: 0 }),
      makeProgress({ pairId: "p2", box: 2, dueAt: NOW - 1 }),
      makeProgress({ pairId: "p3", box: 4, dueAt: NOW + 1000 }),
      makeProgress({ pairId: "p4", box: 5, dueAt: NOW - 5 }),
    ];
    const stats = computeSetStats(pairs, progress, [], NOW);

    expect(stats).toMatchObject({
      total: 5,
      newWords: 2,
      learning: 2,
      mastered: 1,
      due: 2,
      accuracy: null,
      streak: 0,
    });
  });

  it("FR-ST-1: ignores progress of other sets' pairs", () => {
    const stats = computeSetStats(
      pairs,
      [makeProgress({ pairId: "other", box: 5 })],
      [],
      NOW,
    );
    expect(stats.mastered).toBe(0);
    expect(stats.newWords).toBe(5);
  });

  it("FR-ST-1: rounds accuracy over all recorded answers", () => {
    const stats = computeSetStats(
      pairs,
      [],
      [day("2026-10-16", 2, 1), day("2026-10-15", 1, 1)],
      NOW,
    );
    expect(stats.accuracy).toBe(67);
  });

  it("FR-ST-1: handles an empty set", () => {
    const stats = computeSetStats([], [], [], NOW);
    expect(stats).toMatchObject({ total: 0, newWords: 0, accuracy: null });
  });
});

describe("hardestWords", () => {
  const pairs = ["p1", "p2", "p3", "p4"].map((id) => makePair({ id }));

  it("FR-ST-2: sorts by wrong ratio and needs two attempts", () => {
    const progress = [
      makeProgress({ pairId: "p1", correct: 1, wrong: 1 }),
      makeProgress({ pairId: "p2", correct: 0, wrong: 1 }),
      makeProgress({ pairId: "p3", correct: 1, wrong: 3 }),
      makeProgress({ pairId: "p4", correct: 5, wrong: 0 }),
    ];
    const result = hardestWords(pairs, progress);

    expect(result.map((word) => word.pair.id)).toEqual(["p3", "p1"]);
    expect(result[0]?.wrongRatio).toBe(0.75);
  });

  it("FR-ST-2: breaks ties by number of mistakes", () => {
    const progress = [
      makeProgress({ pairId: "p1", correct: 1, wrong: 1 }),
      makeProgress({ pairId: "p2", correct: 2, wrong: 2 }),
    ];
    expect(hardestWords(pairs, progress).map((w) => w.pair.id)).toEqual([
      "p2",
      "p1",
    ]);
  });

  it("FR-ST-2: respects the limit and skips words without progress", () => {
    const progress = [
      makeProgress({ pairId: "p1", correct: 0, wrong: 2 }),
      makeProgress({ pairId: "p2", correct: 0, wrong: 3 }),
    ];
    expect(hardestWords(pairs, progress, 1)).toHaveLength(1);
    expect(hardestWords(pairs, [])).toEqual([]);
  });
});

describe("recentActivity", () => {
  it("FR-ST-3: returns the requested days oldest first with zeros for idle days", () => {
    const result = recentActivity([day("2026-10-15", 4, 3)], NOW, 3);

    expect(result).toEqual([
      { date: "2026-10-14", answered: 0, correct: 0 },
      { date: "2026-10-15", answered: 4, correct: 3 },
      { date: "2026-10-16", answered: 0, correct: 0 },
    ]);
  });

  it("FR-ST-3: defaults to 14 days", () => {
    expect(recentActivity([], NOW)).toHaveLength(14);
  });
});

describe("lastSessionMistakes", () => {
  const [a, b, c, d] = [makePair(), makePair(), makePair(), makePair()];
  const pairs = [a, b, c, d];

  function seen(pair: WordPair, lastSeenAt: number, lastResult?: AnswerResult) {
    return makeProgress({
      pairId: pair.id,
      lastSeenAt,
      ...(lastResult === undefined ? {} : { lastResult }),
    });
  }

  it("NH-15: is empty without answers", () => {
    expect(lastSessionMistakes(pairs, [])).toEqual([]);
  });

  it("NH-15: lists the words whose latest answer was wrong, in the order they were made", () => {
    const progress = [
      seen(a, NOW, "wrong"),
      seen(b, NOW - 60_000, "correct"),
      seen(c, NOW - 120_000, "wrong"),
      seen(d, NOW - 30_000, "assisted"),
    ];

    expect(lastSessionMistakes(pairs, progress)).toEqual([c, a]);
  });

  it("NH-15: ignores mistakes from an earlier session", () => {
    const progress = [
      seen(a, NOW, "wrong"),
      seen(b, NOW - SESSION_GAP_MS - 1, "wrong"),
      seen(c, NOW - SESSION_GAP_MS - 60_000, "wrong"),
    ];

    expect(lastSessionMistakes(pairs, progress)).toEqual([a]);
  });

  it("NH-15: a chain of answers with small gaps is one session", () => {
    const step = SESSION_GAP_MS - 1;
    const progress = [
      seen(a, NOW, "wrong"),
      seen(b, NOW - step, "wrong"),
      seen(c, NOW - 2 * step, "wrong"),
    ];

    expect(lastSessionMistakes(pairs, progress)).toEqual([c, b, a]);
  });

  it("NH-15: records without a last result or last seen time never count", () => {
    const progress = [
      seen(a, NOW),
      makeProgress({ pairId: b.id, lastSeenAt: null, lastResult: "wrong" }),
    ];

    expect(lastSessionMistakes(pairs, progress)).toEqual([]);
  });

  it("NH-15: only looks at the given pairs", () => {
    const stranger = makePair();

    expect(
      lastSessionMistakes([a], [seen(stranger, NOW, "wrong"), seen(a, NOW)]),
    ).toEqual([]);
  });
});
