import { act, renderHook, waitFor } from "@testing-library/react";
import { openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DB_NAME, openAppDb } from "../storage/db";
import { THEME_MIRROR_KEY } from "../storage/preferenceMirror";
import { loadSettings, saveSettings } from "../storage/settingsRepo";
import { deleteAppDatabase, makeSettings } from "../../tests/factories";
import { useSettingsStore } from "./useSettingsStore";

async function readStoredSettings() {
  const db = await openAppDb();
  try {
    return await loadSettings(db);
  } finally {
    db.close();
  }
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await deleteAppDatabase();
});

describe("useSettingsStore", () => {
  it("FR-I18N-1: starts from the browser language and saves defaults on first visit", async () => {
    const { result } = renderHook(() => useSettingsStore());

    expect(result.current.settings.uiLanguage).toBe("en");
    await waitFor(async () => {
      expect(await readStoredSettings()).toEqual(result.current.settings);
    });
  });

  it("FR-THEME-1: starts from the localStorage mirror before IndexedDB loads", () => {
    localStorage.setItem(THEME_MIRROR_KEY, "dark");

    const { result } = renderHook(() => useSettingsStore());

    expect(result.current.settings.theme).toBe("dark");
  });

  it("FR-SETT-1: loads stored settings and refreshes the mirror", async () => {
    const db = await openAppDb();
    await saveSettings(db, makeSettings({ theme: "dark", uiLanguage: "sv" }));
    db.close();

    const { result } = renderHook(() => useSettingsStore());

    await waitFor(() => {
      expect(result.current.settings.uiLanguage).toBe("sv");
    });
    expect(result.current.settings.theme).toBe("dark");
    expect(localStorage.getItem(THEME_MIRROR_KEY)).toBe("dark");
  });

  it("FR-SETT-1: persists an update to IndexedDB and the mirror", async () => {
    const { result } = renderHook(() => useSettingsStore());
    await waitFor(async () => {
      expect(await readStoredSettings()).not.toBeNull();
    });

    act(() => {
      result.current.updateSettings({ theme: "dark", sessionSize: 50 });
    });

    expect(result.current.settings.theme).toBe("dark");
    expect(localStorage.getItem(THEME_MIRROR_KEY)).toBe("dark");
    await waitFor(async () => {
      expect(await readStoredSettings()).toMatchObject({
        theme: "dark",
        sessionSize: 50,
      });
    });
  });

  it("FR-BP-4: reports unavailable storage and keeps working in memory", () => {
    vi.stubGlobal("indexedDB", undefined);

    const { result } = renderHook(() => useSettingsStore());
    act(() => {
      result.current.updateSettings({ theme: "light" });
    });

    expect(result.current.storageError).toBe("unavailable");
    expect(result.current.settings.theme).toBe("light");
  });

  it("FR-BP-4: reports a failure when loading settings throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(IDBObjectStore.prototype, "get").mockImplementation(() => {
      throw new DOMException("broken", "UnknownError");
    });

    const { result } = renderHook(() => useSettingsStore());

    await waitFor(() => {
      expect(result.current.storageError).toBe("failed");
    });
  });

  it("FR-BP-4: reports a failure when saving settings throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() => useSettingsStore());
    await waitFor(async () => {
      expect(await readStoredSettings()).not.toBeNull();
    });
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    act(() => {
      result.current.updateSettings({ theme: "light" });
    });

    await waitFor(() => {
      expect(result.current.storageError).toBe("failed");
    });
    expect(result.current.settings.theme).toBe("light");
  });

  it("FR-BP-4: closes its connection when another tab needs an upgrade", async () => {
    const { result } = renderHook(() => useSettingsStore());
    await waitFor(async () => {
      expect(await readStoredSettings()).not.toBeNull();
    });

    const upgraded = await openDB(DB_NAME, 2);
    upgraded.close();

    expect(result.current.storageError).toBeNull();
  });
});
