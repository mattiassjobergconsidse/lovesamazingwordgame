import { describe, expect, it } from "vitest";
import {
  checkAnswer,
  diffAnswer,
  foldAccents,
  hintPrefix,
  normalizeAnswer,
} from "./checkAnswer";

const strict = { ignoreAccents: false };
const lenient = { ignoreAccents: true };

describe("normalizeAnswer", () => {
  it("FR-WR-2: trims, collapses whitespace and ignores case", () => {
    expect(normalizeAnswer("  The   Big  DOG ")).toBe("the big dog");
  });

  it("strips surrounding punctuation but keeps inner punctuation", () => {
    expect(normalizeAnswer("¿don't know?!")).toBe("don't know");
  });

  it("normalises Unicode to NFC", () => {
    expect(normalizeAnswer("a\u0308")).toBe("\u00e4");
  });
});

describe("foldAccents", () => {
  it("removes diacritics", () => {
    expect(foldAccents("Smörgåsbord")).toBe("smorgasbord");
  });
});

describe("checkAnswer", () => {
  it("FR-WR-2: accepts a normalised exact match", () => {
    expect(checkAnswer("  BIG ", ["big"], strict)).toEqual({
      result: "correct",
      closest: "big",
    });
  });

  it("FR-WR-2: accepts any alternative answer", () => {
    expect(checkAnswer("large", ["big", "large"], strict)).toEqual({
      result: "correct",
      closest: "large",
    });
  });

  it("FR-WR-2: accent-only difference is assisted by default", () => {
    expect(checkAnswer("skarp", ["skärp"], strict)).toEqual({
      result: "assisted",
      closest: "skärp",
    });
  });

  it("FR-WR-2: accent-only difference is correct when ignoreAccents is on", () => {
    expect(checkAnswer("skarp", ["skärp"], lenient).result).toBe("correct");
  });

  it("FR-WR-2: a different letter is wrong, not an accent difference", () => {
    expect(checkAnswer("skurp", ["skärp"], lenient).result).toBe("wrong");
  });

  it("treats empty or punctuation-only input as wrong", () => {
    expect(checkAnswer("   ", ["big"], strict).result).toBe("wrong");
    expect(checkAnswer("?!", ["big"], strict).result).toBe("wrong");
  });

  it("returns the most similar accepted answer when wrong", () => {
    expect(checkAnswer("larg", ["big", "large"], strict)).toEqual({
      result: "wrong",
      closest: "large",
    });
  });

  it("handles an empty accepted list", () => {
    expect(checkAnswer("x", [], strict)).toEqual({
      result: "wrong",
      closest: "",
    });
  });

  it("handles emoji", () => {
    expect(checkAnswer("🐶", ["🐶"], strict).result).toBe("correct");
  });
});

describe("diffAnswer", () => {
  it("FR-WR-3: marks everything as matching for an identical answer", () => {
    expect(diffAnswer("Dog", "dog")).toEqual([{ text: "dog", matches: true }]);
  });

  it("FR-WR-3: highlights the letters that were missing or different", () => {
    expect(diffAnswer("hose", "house")).toEqual([
      { text: "ho", matches: true },
      { text: "u", matches: false },
      { text: "se", matches: true },
    ]);
  });

  it("FR-WR-3: treats an accent difference as a mismatch", () => {
    expect(diffAnswer("skarp", "skärp")).toEqual([
      { text: "sk", matches: true },
      { text: "ä", matches: false },
      { text: "rp", matches: true },
    ]);
  });

  it("marks the whole answer as differing when nothing was typed", () => {
    expect(diffAnswer("", "cat")).toEqual([{ text: "cat", matches: false }]);
  });

  it("returns no segments for an empty expected answer", () => {
    expect(diffAnswer("abc", "")).toEqual([]);
  });

  it("ignores extra typed characters", () => {
    const segments = diffAnswer("caats", "cat");
    expect(segments.map((segment) => segment.text).join("")).toBe("cat");
    expect(segments.every((segment) => segment.matches)).toBe(true);
  });
});

describe("hintPrefix", () => {
  it("FR-WR-4: reveals the first letters", () => {
    expect(hintPrefix("house", 2)).toBe("ho");
  });

  it("clamps to the answer length and to zero", () => {
    expect(hintPrefix("ab", 5)).toBe("ab");
    expect(hintPrefix("ab", -1)).toBe("");
  });

  it("counts whole characters, not UTF-16 units", () => {
    expect(hintPrefix("🐶🐱", 1)).toBe("🐶");
  });
});
