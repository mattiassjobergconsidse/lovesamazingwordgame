import { openDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DB_NAME,
  DB_VERSION,
  isIndexedDbAvailable,
  openAppDb,
  type WordGameDatabase,
} from "./db";

const openConnections: WordGameDatabase[] = [];

async function open(
  handlers?: Parameters<typeof openAppDb>[0],
): Promise<WordGameDatabase> {
  const db = await openAppDb(handlers);
  openConnections.push(db);
  return db;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  for (const db of openConnections.splice(0)) {
    db.close();
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error("deleteDatabase failed"));
    };
  });
});

describe("openAppDb", () => {
  it("creates all object stores", async () => {
    const db = await open();

    expect([...db.objectStoreNames].sort()).toEqual([
      "activity",
      "pairs",
      "progress",
      "sets",
      "settings",
      "trophies",
    ]);
  });

  it("NH-10: upgrades a version 1 database by adding trophies and keeping its data", async () => {
    const old = await openDB(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore("sets", { keyPath: "id" });
        database.createObjectStore("pairs", { keyPath: "id" });
        database.createObjectStore("progress", { keyPath: "pairId" });
        database.createObjectStore("activity", { keyPath: "id" });
        database.createObjectStore("settings");
      },
    });
    await old.put("sets", { id: "kept", name: "Kept" });
    old.close();

    const db = await open();

    expect([...db.objectStoreNames]).toContain("trophies");
    expect(await db.get("sets", "kept")).toMatchObject({ name: "Kept" });
  });

  it("creates the setId index on pairs, progress and activity", async () => {
    const db = await open();
    const tx = db.transaction(["pairs", "progress", "activity"]);

    expect([...tx.objectStore("pairs").indexNames]).toEqual(["setId"]);
    expect([...tx.objectStore("progress").indexNames]).toEqual(["setId"]);
    expect([...tx.objectStore("activity").indexNames]).toEqual(["setId"]);
    await tx.done;
  });

  it("keeps existing data when reopened", async () => {
    const first = await open();
    await first.put(
      "settings",
      {
        uiLanguage: "en",
        theme: "dark",
        activeSetId: null,
        directionMode: "random",
        sessionSize: 20,
        ignoreAccents: false,
        speechEnabled: false,
        soundEnabled: false,
        hapticsEnabled: false,
        dailyGoal: 10,
      },
      "settings",
    );
    first.close();

    const second = await open();

    expect((await second.get("settings", "settings"))?.theme).toBe("dark");
  });

  it("FR-BP-4: tells the holder of an old connection that it blocks an upgrade", async () => {
    const onBlocking = vi.fn();
    const db = await open({
      onBlocking: () => {
        onBlocking();
        db.close();
      },
    });

    const upgraded = await openDB(DB_NAME, DB_VERSION + 1);
    upgraded.close();

    expect(onBlocking).toHaveBeenCalledOnce();
  });
});

describe("isIndexedDbAvailable", () => {
  it("is true when IndexedDB exists", () => {
    expect(isIndexedDbAvailable()).toBe(true);
  });

  it("is false when IndexedDB is missing", () => {
    vi.stubGlobal("indexedDB", undefined);

    expect(isIndexedDbAvailable()).toBe(false);
  });
});
