import { describe, expect, it } from "vitest";
import {
  activityId,
  addAnswerToActivity,
  formatDuration,
  localDateKey,
} from "./activity";

describe("localDateKey", () => {
  it("FR-TRN-4: formats a local date with zero padding", () => {
    expect(localDateKey(new Date(2026, 0, 5, 12, 30).getTime())).toBe(
      "2026-01-05",
    );
  });

  it("FR-TRN-4: uses the local day just before midnight", () => {
    expect(localDateKey(new Date(2026, 11, 31, 23, 59).getTime())).toBe(
      "2026-12-31",
    );
  });
});

describe("addAnswerToActivity", () => {
  it("FR-TRN-4: creates the record of the day on the first answer", () => {
    expect(
      addAnswerToActivity(undefined, "s1", "2026-01-05", "correct"),
    ).toEqual({
      id: "s1:2026-01-05",
      setId: "s1",
      date: "2026-01-05",
      answered: 1,
      correct: 1,
    });
  });

  it("FR-TRN-4: counts wrong and assisted answers as answered but not correct", () => {
    const first = addAnswerToActivity(undefined, "s1", "2026-01-05", "wrong");
    const second = addAnswerToActivity(first, "s1", "2026-01-05", "assisted");

    expect(second).toMatchObject({ answered: 2, correct: 0 });
  });

  it("FR-TRN-4: does not modify the existing record", () => {
    const existing = {
      id: activityId("s1", "2026-01-05"),
      setId: "s1",
      date: "2026-01-05",
      answered: 3,
      correct: 2,
    };

    const updated = addAnswerToActivity(
      existing,
      "s1",
      "2026-01-05",
      "correct",
    );

    expect(updated).toMatchObject({ answered: 4, correct: 3 });
    expect(existing.answered).toBe(3);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [5_000, "0:05"],
    [125_000, "2:05"],
    [3_600_000, "60:00"],
    [-10, "0:00"],
  ])("FR-TRN-5: formats %i ms as %s", (milliseconds, expected) => {
    expect(formatDuration(milliseconds)).toBe(expected);
  });
});
