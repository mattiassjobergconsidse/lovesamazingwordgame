import { describe, expect, it } from "vitest";
import { resolveWritingResult } from "./writingResult";

describe("resolveWritingResult", () => {
  it("FR-WR-4: a correct answer with a hint is assisted", () => {
    expect(resolveWritingResult("correct", true)).toBe("assisted");
  });

  it("keeps a correct answer without a hint correct", () => {
    expect(resolveWritingResult("correct", false)).toBe("correct");
  });

  it("FR-WR-4: a hint never turns a wrong answer into assisted", () => {
    expect(resolveWritingResult("wrong", true)).toBe("wrong");
  });

  it("keeps an accent-only answer assisted", () => {
    expect(resolveWritingResult("assisted", false)).toBe("assisted");
    expect(resolveWritingResult("assisted", true)).toBe("assisted");
  });
});
