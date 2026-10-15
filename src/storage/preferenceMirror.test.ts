import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LANGUAGE_MIRROR_KEY,
  THEME_MIRROR_KEY,
  getLocalStorage,
  readPreferenceMirror,
  writePreferenceMirror,
} from "./preferenceMirror";

beforeEach(() => {
  localStorage.clear();
});

describe("preference mirror", () => {
  it("FR-THEME-1: round-trips theme and language", () => {
    writePreferenceMirror({ theme: "dark", uiLanguage: "en" });

    expect(readPreferenceMirror()).toEqual({ theme: "dark", uiLanguage: "en" });
  });

  it("returns an empty object when nothing is stored", () => {
    expect(readPreferenceMirror()).toEqual({});
  });

  it("ignores invalid stored values", () => {
    localStorage.setItem(THEME_MIRROR_KEY, "blue");
    localStorage.setItem(LANGUAGE_MIRROR_KEY, "de");

    expect(readPreferenceMirror()).toEqual({});
  });

  it("returns an empty object without storage", () => {
    expect(readPreferenceMirror(null)).toEqual({});
  });

  it("reports false when there is no storage", () => {
    expect(
      writePreferenceMirror({ theme: "light", uiLanguage: "sv" }, null),
    ).toBe(false);
  });

  it("reports false when the write fails", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(writePreferenceMirror({ theme: "light", uiLanguage: "sv" })).toBe(
      false,
    );
  });
});

describe("getLocalStorage", () => {
  it("returns localStorage when accessible", () => {
    expect(getLocalStorage()).toBe(localStorage);
  });

  it("returns null when access is denied", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(getLocalStorage()).toBeNull();
  });
});
