import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useActiveSet } from "./useActiveSet";
import { useDatabase } from "./useDatabase";
import { useLibrary } from "./useLibrary";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("context hooks", () => {
  it.each([
    ["useDatabase", useDatabase, /DatabaseProvider/],
    ["useLibrary", useLibrary, /LibraryProvider/],
  ] as const)("%s throws outside its provider", (_name, hook, message) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => hook())).toThrow(message);
  });

  it("useActiveSet throws outside the providers it depends on", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useActiveSet())).toThrow(/SettingsProvider/);
  });
});
