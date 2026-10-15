import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DbEventHandlers, WordGameDatabase } from "../storage/db";
import { openAppDb } from "../storage/db";
import { useSettingsStore } from "./useSettingsStore";

// The database boundary is mocked so lifecycle events can be triggered on demand.
vi.mock("../storage/db", () => ({
  isIndexedDbAvailable: () => true,
  openAppDb: vi.fn(),
}));
vi.mock("../storage/settingsRepo", () => ({
  loadSettings: vi.fn(() => Promise.resolve(null)),
  saveSettings: vi.fn(() => Promise.resolve()),
}));

const close = vi.fn();
let handlers: DbEventHandlers = {};

beforeEach(() => {
  close.mockClear();
  handlers = {};
  vi.mocked(openAppDb).mockImplementation((given = {}) => {
    handlers = given;
    // Only `close` is used by the hook.
    return Promise.resolve({ close } as unknown as WordGameDatabase);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSettingsStore database events", () => {
  it("FR-BP-4: reports a blocked upgrade", async () => {
    const { result } = renderHook(() => useSettingsStore());

    await act(async () => {
      await Promise.resolve();
      handlers.onBlocked?.();
    });

    expect(result.current.storageError).toBe("blocked");
  });

  it("FR-BP-4: reports a terminated connection", async () => {
    const { result } = renderHook(() => useSettingsStore());

    await act(async () => {
      await Promise.resolve();
      handlers.onTerminated?.();
    });

    expect(result.current.storageError).toBe("failed");
  });

  it("FR-BP-4: closes the connection when another tab needs an upgrade", async () => {
    renderHook(() => useSettingsStore());

    await act(async () => {
      await Promise.resolve();
      handlers.onBlocking?.();
      await Promise.resolve();
    });

    expect(close).toHaveBeenCalled();
  });

  it("FR-BP-4: releases the connection on unmount", async () => {
    const { unmount } = renderHook(() => useSettingsStore());
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    await Promise.resolve();

    expect(close).toHaveBeenCalled();
  });

  it("FR-BP-4: reports a failure when the database cannot be opened", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(openAppDb).mockRejectedValue(new Error("open failed"));

    const { result, unmount } = renderHook(() => useSettingsStore());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.storageError).toBe("failed");
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it("ignores a load result that arrives after unmount", async () => {
    const { unmount } = renderHook(() => useSettingsStore());
    unmount();

    await act(async () => {
      await Promise.resolve();
    });

    expect(close).toHaveBeenCalled();
  });
});
