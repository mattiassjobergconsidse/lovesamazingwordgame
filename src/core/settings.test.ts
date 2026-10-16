import { describe, expect, it } from "vitest";
import {
  THEMES,
  createDefaultSettings,
  isDarkTheme,
  isTheme,
  isUiLanguage,
  parseSettings,
  pickUiLanguage,
  resolveTheme,
} from "./settings";

describe("pickUiLanguage", () => {
  it("FR-I18N-1: uses the browser language when it is Swedish", () => {
    expect(pickUiLanguage(["sv-SE", "en"])).toBe("sv");
  });

  it("FR-I18N-1: uses the browser language when it is English", () => {
    expect(pickUiLanguage(["en-GB"])).toBe("en");
  });

  it("FR-I18N-1: falls back to Swedish for other languages", () => {
    expect(pickUiLanguage(["de-DE", "en"])).toBe("sv");
  });

  it("FR-I18N-1: falls back to Swedish when no language is known", () => {
    expect(pickUiLanguage([])).toBe("sv");
  });
});

describe("createDefaultSettings", () => {
  it("returns the documented defaults", () => {
    expect(createDefaultSettings(["en-US"])).toEqual({
      uiLanguage: "en",
      theme: "system",
      activeSetId: null,
      directionMode: "random",
      sessionSize: 20,
      ignoreAccents: false,
      speechEnabled: false,
    });
  });
});

describe("type guards", () => {
  it("accepts only known themes", () => {
    expect(["light", "dark", "system"].every(isTheme)).toBe(true);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it("accepts only known UI languages", () => {
    expect(isUiLanguage("sv")).toBe(true);
    expect(isUiLanguage("en")).toBe(true);
    expect(isUiLanguage("de")).toBe(false);
  });
});

describe("parseSettings", () => {
  const valid = createDefaultSettings(["sv"]);

  it("accepts a valid record", () => {
    expect(
      parseSettings({ ...valid, activeSetId: "abc", sessionSize: "all" }),
    ).toEqual({ ...valid, activeSetId: "abc", sessionSize: "all" });
  });

  it.each([
    ["null", null],
    ["a string", "settings"],
    ["an array", []],
    ["an empty object", {}],
    ["an invalid language", { ...valid, uiLanguage: "de" }],
    ["an invalid theme", { ...valid, theme: "blue" }],
    ["a numeric active set", { ...valid, activeSetId: 5 }],
    ["an invalid direction", { ...valid, directionMode: "up" }],
    ["an invalid session size", { ...valid, sessionSize: 15 }],
    ["a non-boolean ignoreAccents", { ...valid, ignoreAccents: "no" }],
    ["a non-boolean speechEnabled", { ...valid, speechEnabled: 1 }],
  ])("rejects %s", (_label, value) => {
    expect(parseSettings(value)).toBeNull();
  });

  it("accepts every direction mode", () => {
    for (const directionMode of ["random", "AtoB", "BtoA"]) {
      expect(parseSettings({ ...valid, directionMode })).not.toBeNull();
    }
  });
});

describe("resolveTheme", () => {
  it("FR-THEME-1: follows the system preference in system mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("FR-THEME-1: explicit choices ignore the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("christmas", true)).toBe("christmas");
  });
});

describe("fun themes", () => {
  it("P7: accepts every listed theme", () => {
    expect(THEMES.every(isTheme)).toBe(true);
    expect(THEMES).toEqual(
      expect.arrayContaining(["christmas", "halloween", "blocks", "battle"]),
    );
  });

  it("P7: reports the colour scheme of each resolved theme", () => {
    expect(isDarkTheme("light")).toBe(false);
    expect(isDarkTheme("christmas")).toBe(false);
    expect(isDarkTheme("dark")).toBe(true);
    expect(isDarkTheme("halloween")).toBe(true);
    expect(isDarkTheme("blocks")).toBe(true);
    expect(isDarkTheme("battle")).toBe(true);
  });
});
