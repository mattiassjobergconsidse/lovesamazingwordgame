import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSettings } from "./useSettings";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSettings", () => {
  it("throws when used outside a SettingsProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useSettings())).toThrow(/SettingsProvider/);
  });
});
