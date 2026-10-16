import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ImportPlan } from "../core/importPlan";
import {
  deleteAppDatabase,
  makePair,
  makeProgress,
  makeSet,
} from "../../tests/factories";
import { openAppDb, type WordGameDatabase } from "./db";
import { applyImportPlan, clearLibrary } from "./exportImport";
import { loadLibrary, putSetWithPairs } from "./setsRepo";

let db: WordGameDatabase;

beforeEach(async () => {
  db = await openAppDb();
});

afterEach(async () => {
  db.close();
  await deleteAppDatabase();
});

function emptyPlan(overrides: Partial<ImportPlan> = {}): ImportPlan {
  return {
    removeSetIds: [],
    sets: [],
    pairs: [],
    progress: [],
    activity: [],
    replacements: new Map(),
    ...overrides,
  };
}

async function storeOldSet() {
  const set = makeSet({ name: "Old" });
  const pair = makePair({ setId: set.id });
  await putSetWithPairs(db, set, [pair]);
  await db.put("progress", makeProgress({ pairId: pair.id, setId: set.id }));
  await db.put("activity", {
    id: `${set.id}:2026-10-15`,
    setId: set.id,
    date: "2026-10-15",
    answered: 1,
    correct: 1,
  });
  return set;
}

describe("applyImportPlan", () => {
  it("FR-IO-2: stores sets, pairs, progress and activity next to existing data", async () => {
    const existing = await storeOldSet();
    const set = makeSet({ name: "New" });
    const pair = makePair({ setId: set.id });

    await applyImportPlan(
      db,
      emptyPlan({
        sets: [set],
        pairs: [pair],
        progress: [makeProgress({ pairId: pair.id, setId: set.id, box: 4 })],
        activity: [
          {
            id: `${set.id}:2026-10-16`,
            setId: set.id,
            date: "2026-10-16",
            answered: 2,
            correct: 2,
          },
        ],
      }),
    );

    const library = await loadLibrary(db);
    expect(library.sets.map((stored) => stored.id).sort()).toEqual(
      [existing.id, set.id].sort(),
    );
    expect(library.pairs).toHaveLength(2);
    expect(library.progress).toHaveLength(2);
    expect(library.activity).toHaveLength(2);
  });

  it("FR-IO-2: replacing deletes the old set with all its data", async () => {
    const old = await storeOldSet();
    const replacement = makeSet({ name: "Old" });

    await applyImportPlan(
      db,
      emptyPlan({ removeSetIds: [old.id], sets: [replacement] }),
    );

    const library = await loadLibrary(db);
    expect(library.sets).toEqual([replacement]);
    expect(library.pairs).toEqual([]);
    expect(library.progress).toEqual([]);
    expect(library.activity).toEqual([]);
  });

  it("FR-IO-2: rolls everything back when a write fails", async () => {
    const old = await storeOldSet();
    // A function cannot be stored, so this write fails after the delete has been queued.
    const broken = Object.assign(makeSet({ name: "Broken" }), {
      cannotBeCloned: () => 1,
    });

    await expect(
      applyImportPlan(
        db,
        emptyPlan({ removeSetIds: [old.id], sets: [broken] }),
      ),
    ).rejects.toThrow();

    const library = await loadLibrary(db);
    expect(library.sets).toEqual([old]);
    expect(library.pairs).toHaveLength(1);
    expect(library.progress).toHaveLength(1);
    expect(library.activity).toHaveLength(1);
  });
});

describe("clearLibrary", () => {
  it("FR-IO-4: deletes all sets, pairs, progress and activity", async () => {
    await storeOldSet();

    await clearLibrary(db);

    expect(await loadLibrary(db)).toEqual({
      sets: [],
      pairs: [],
      progress: [],
      activity: [],
    });
  });

  it("FR-IO-4: keeps the settings record", async () => {
    await db.put(
      "settings",
      {
        uiLanguage: "sv",
        theme: "dark",
        activeSetId: null,
        directionMode: "random",
        sessionSize: 20,
        ignoreAccents: false,
        speechEnabled: false,
        soundEnabled: false,
        hapticsEnabled: false,
      },
      "settings",
    );

    await clearLibrary(db);

    expect(await db.count("settings")).toBe(1);
  });
});
