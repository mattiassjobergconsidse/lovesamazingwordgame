import { describe, expect, it } from "vitest";
import {
  flashcardActionForKey,
  gradeFromSwipe,
  SWIPE_THRESHOLD_PX,
} from "./flashcardInput";

describe("gradeFromSwipe", () => {
  it("FR-FC-2: a long swipe right means correct", () => {
    expect(gradeFromSwipe(SWIPE_THRESHOLD_PX, 0)).toBe("correct");
  });

  it("FR-FC-2: a long swipe left means wrong", () => {
    expect(gradeFromSwipe(-SWIPE_THRESHOLD_PX - 40, 10)).toBe("wrong");
  });

  it("FR-FC-2: ignores short movements", () => {
    expect(gradeFromSwipe(SWIPE_THRESHOLD_PX - 1, 0)).toBeNull();
    expect(gradeFromSwipe(0, 0)).toBeNull();
  });

  it("FR-FC-2: ignores mostly vertical gestures (scrolling)", () => {
    expect(gradeFromSwipe(SWIPE_THRESHOLD_PX + 1, 200)).toBeNull();
  });
});

describe("flashcardActionForKey", () => {
  it.each([
    [" ", "flip"],
    ["ArrowRight", "correct"],
    ["2", "correct"],
    ["ArrowLeft", "wrong"],
    ["1", "wrong"],
  ] as const)("FR-FC-1, FR-FC-2: maps %j to %s", (key, action) => {
    expect(flashcardActionForKey(key)).toBe(action);
  });

  it("returns null for unrelated keys", () => {
    expect(flashcardActionForKey("a")).toBeNull();
    expect(flashcardActionForKey("Enter")).toBeNull();
  });
});
