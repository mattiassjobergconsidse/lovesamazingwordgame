import { describe, expect, it } from "vitest";
import { localDateKey } from "./activity";
import { dayPeriod, homeSummary } from "./home";
import { shiftDateKey } from "./stats";
import type { DailyActivity, WordPair } from "../types";

const now = new Date(2026, 9, 16, 12, 0, 0).getTime();
const today = localDateKey(now);

function day(date: string, answered: number, correct: number): DailyActivity {
  return { id: `s:${date}`, setId: "s", date, answered, correct };
}

const pairs: WordPair[] = [
  { id: "p1", setId: "s", a: "hus", b: "house", createdAt: 0, updatedAt: 0 },
];

describe("dayPeriod", () => {
  it("HOME-1: maps hours to the part of the day", () => {
    expect(dayPeriod(4)).toBe("night");
    expect(dayPeriod(5)).toBe("morning");
    expect(dayPeriod(11)).toBe("morning");
    expect(dayPeriod(12)).toBe("afternoon");
    expect(dayPeriod(17)).toBe("afternoon");
    expect(dayPeriod(18)).toBe("evening");
    expect(dayPeriod(21)).toBe("evening");
    expect(dayPeriod(22)).toBe("night");
    expect(dayPeriod(0)).toBe("night");
  });
});

describe("homeSummary", () => {
  it("HOME-1: has no accuracy and no progress before any answer", () => {
    const summary = homeSummary(pairs, [], [], now, 10);

    expect(summary.weekAccuracy).toBeNull();
    expect(summary.answeredToday).toBe(0);
    expect(summary.goalProgress).toBe(0);
    expect(summary.stats.total).toBe(1);
  });

  it("HOME-1: counts today towards the goal and the last 7 days towards accuracy", () => {
    const activity = [
      day(today, 5, 4),
      day(shiftDateKey(today, -6), 5, 1),
      // Older than 7 days: ignored by the home accuracy.
      day(shiftDateKey(today, -7), 100, 0),
    ];

    const summary = homeSummary(pairs, [], activity, now, 10);

    expect(summary.answeredToday).toBe(5);
    expect(summary.goalProgress).toBe(0.5);
    expect(summary.weekAccuracy).toBe(50);
  });

  it("HOME-1: caps the goal progress at 1", () => {
    const summary = homeSummary(pairs, [], [day(today, 30, 10)], now, 10);

    expect(summary.goalProgress).toBe(1);
  });

  it("HOME-1: measures today against the chosen goal", () => {
    const activity = [day(today, 5, 5)];

    expect(homeSummary(pairs, [], activity, now, 5).goalProgress).toBe(1);
    expect(homeSummary(pairs, [], activity, now, 20).goalProgress).toBe(0.25);
  });
});
