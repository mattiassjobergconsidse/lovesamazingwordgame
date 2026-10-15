import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResolvedTheme } from "./useResolvedTheme";

type Listener = () => void;

/** Replaces matchMedia with a controllable dark-mode preference. */
function mockSystemTheme(initialDark: boolean): (dark: boolean) => void {
  let dark = initialDark;
  const listeners = new Set<Listener>();
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string): MediaQueryList => ({
      get matches() {
        return dark;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: unknown) => {
        listeners.add(listener as Listener);
      },
      removeEventListener: (_type: string, listener: unknown) => {
        listeners.delete(listener as Listener);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  );
  return (next) => {
    dark = next;
    for (const listener of listeners) {
      listener();
    }
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useResolvedTheme", () => {
  it("FR-THEME-1: system mode follows the OS and reacts live", () => {
    const setSystemDark = mockSystemTheme(false);
    const { result } = renderHook(() => useResolvedTheme("system"));
    expect(result.current).toBe("light");

    act(() => {
      setSystemDark(true);
    });

    expect(result.current).toBe("dark");
  });

  it("FR-THEME-1: an explicit choice ignores the OS", () => {
    const setSystemDark = mockSystemTheme(true);
    const { result } = renderHook(() => useResolvedTheme("light"));

    act(() => {
      setSystemDark(false);
    });

    expect(result.current).toBe("light");
  });

  it("stops listening after unmount", () => {
    const setSystemDark = mockSystemTheme(false);
    const { result, unmount } = renderHook(() => useResolvedTheme("system"));
    unmount();

    expect(() => {
      setSystemDark(true);
    }).not.toThrow();
    expect(result.current).toBe("light");
  });
});
