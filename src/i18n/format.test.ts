import { describe, expect, it } from "vitest";
import { formatNumber, interpolate, selectPlural } from "./format";

describe("selectPlural", () => {
  it("FR-I18N-2: uses the singular form for exactly one", () => {
    expect(selectPlural("en", 1)).toBe("one");
    expect(selectPlural("sv", 1)).toBe("one");
  });

  it("FR-I18N-2: uses the plural form for zero and many", () => {
    expect(selectPlural("en", 0)).toBe("other");
    expect(selectPlural("en", 2)).toBe("other");
  });
});

describe("formatNumber", () => {
  it("FR-I18N-2: groups digits per language", () => {
    expect(formatNumber("en", 1234.5)).toBe("1,234.5");
    expect(formatNumber("sv", 0.5)).toBe("0,5");
  });
});

describe("interpolate", () => {
  it("replaces known placeholders", () => {
    expect(
      interpolate("{count} words in {name}", { count: 3, name: "A" }),
    ).toBe("3 words in A");
  });

  it("keeps unknown placeholders visible", () => {
    expect(interpolate("Hello {who}", {})).toBe("Hello {who}");
  });
});
