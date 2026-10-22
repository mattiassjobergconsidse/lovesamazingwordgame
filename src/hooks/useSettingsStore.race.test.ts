import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openAppDb, type WordGameDatabase } from "../storage/db";
import { loadSettings, saveSettings } from "../storage/settingsRepo";
import type * as SettingsRepo from "../storage/settingsRepo";
import { deleteAppDatabase, makeSettings } from "../../tests/factories";
import { renderSettingsStore } from "../../tests/renderWithDatabase";

// Lets a test hold the settings load open until it has made a change.
const loadGate = vi.hoisted(() => {
  let release: () => void = () => undefined;
  let blocked = false;
  return {
    block(): void {
      blocked = true;
    },
    release(): void {
      blocked = false;
      release();
    },
    wait(): Promise<void> {
      return blocked
        ? new Promise((resolve) => {
            release = resolve;
          })
        : Promise.resolve();
    },
    calls: { count: 0 },
  };
});

vi.mock("../storage/settingsRepo", async (importOriginal) => {
  const actual = await importOriginal<typeof SettingsRepo>();
  return {
    ...actual,
    loadSettings: async (db: WordGameDatabase) => {
      loadGate.calls.count += 1;
      await loadGate.wait();
      return await actual.loadSettings(db);
    },
  };
});

async function readStoredSettings() {
  const db = await openAppDb();
  try {
    return await loadSettings(db);
  } finally {
    db.close();
  }
}

afterEach(async () => {
  loadGate.release();
  loadGate.calls.count = 0;
  localStorage.clear();
  await deleteAppDatabase();
});

describe("useSettingsStore load race", () => {
  it("FR-SETT-1: a change made after the database opens but before settings load keeps the stored settings", async () => {
    const db = await openAppDb();
    await saveSettings(
      db,
      makeSettings({ activeSetId: "set-1", dailyGoal: 10 }),
    );
    db.close();
    loadGate.block();

    const { result } = renderSettingsStore();
    // The database is open and the load has started, but has not read anything yet.
    await waitFor(() => {
      expect(loadGate.calls.count).toBeGreaterThan(0);
    });
    act(() => {
      result.current.updateSettings({ dailyGoal: 5 });
    });
    act(() => {
      loadGate.release();
    });

    await waitFor(() => {
      expect(result.current.settings).toMatchObject({
        activeSetId: "set-1",
        dailyGoal: 5,
      });
    });
    await waitFor(async () => {
      expect(await readStoredSettings()).toMatchObject({
        activeSetId: "set-1",
        dailyGoal: 5,
      });
    });
  });

  it("FR-SETT-1: a change made right after loading is saved on top of the stored settings", async () => {
    const db = await openAppDb();
    await saveSettings(
      db,
      makeSettings({ activeSetId: "set-1", theme: "dark" }),
    );
    db.close();

    const { result } = renderSettingsStore();
    await waitFor(() => {
      expect(result.current.settings.activeSetId).toBe("set-1");
    });
    act(() => {
      result.current.updateSettings({ dailyGoal: 20 });
    });

    await waitFor(async () => {
      expect(await readStoredSettings()).toMatchObject({
        activeSetId: "set-1",
        theme: "dark",
        dailyGoal: 20,
      });
    });
  });
});
