import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultSettings } from "../core/settings";
import { DB_NAME, openAppDb, type WordGameDatabase } from "./db";
import { loadSettings, saveSettings } from "./settingsRepo";

let db: WordGameDatabase;

beforeEach(async () => {
  db = await openAppDb();
});

afterEach(async () => {
  db.close();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      resolve();
    };
  });
});

describe("settingsRepo", () => {
  it("FR-SETT-1: returns null before anything is saved", async () => {
    expect(await loadSettings(db)).toBeNull();
  });

  it("FR-SETT-1: round-trips settings", async () => {
    const settings = {
      ...createDefaultSettings(["en"]),
      theme: "dark" as const,
      activeSetId: "set-1",
    };

    await saveSettings(db, settings);

    expect(await loadSettings(db)).toEqual(settings);
  });

  it("FR-SETT-1: overwrites the previous record", async () => {
    await saveSettings(db, createDefaultSettings(["sv"]));
    await saveSettings(db, {
      ...createDefaultSettings(["sv"]),
      theme: "light",
    });

    expect((await loadSettings(db))?.theme).toBe("light");
    expect(await db.count("settings")).toBe(1);
  });

  it("returns null for a corrupted record", async () => {
    await db.put(
      "settings",
      // Deliberately invalid to simulate a corrupted store.
      { theme: "blue" } as never,
      "settings",
    );

    expect(await loadSettings(db)).toBeNull();
  });
});
