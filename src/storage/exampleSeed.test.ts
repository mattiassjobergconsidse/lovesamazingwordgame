import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteAppDatabase,
  makeSettings,
  makeSet,
} from "../../tests/factories";
import { openAppDb, type WordGameDatabase } from "./db";
import { seedFirstVisit } from "./exampleSeed";
import { loadSettings, saveSettings } from "./settingsRepo";
import { loadLibrary, putSet } from "./setsRepo";

let db: WordGameDatabase;
let idCounter = 0;
const env = {
  now: 5000,
  newId: () => {
    idCounter += 1;
    return `id-${String(idCounter)}`;
  },
};

beforeEach(async () => {
  idCounter = 0;
  db = await openAppDb();
});

afterEach(async () => {
  db.close();
  await deleteAppDatabase();
});

describe("seedFirstVisit", () => {
  it("FR-SET-1: creates the Swedish-English example set in display order and makes it active", async () => {
    const seeded = await seedFirstVisit(db, makeSettings(), env);

    expect(seeded).toBe(true);
    const library = await loadLibrary(db);
    expect(library.sets).toHaveLength(1);
    expect(library.pairs).toHaveLength(20);
    expect(library.pairs[0]).toMatchObject({ a: "hund", b: "dog" });
    expect(library.pairs.map((pair) => pair.setId)).toEqual(
      Array<string>(20).fill(library.sets[0]?.id ?? ""),
    );
    expect(library.pairs.find((pair) => pair.a === "stor")?.altB).toEqual([
      "large",
    ]);
    expect((await loadSettings(db))?.activeSetId).toBe(library.sets[0]?.id);
  });

  it("FR-SET-1: keeps the language and theme from the initial settings", async () => {
    await seedFirstVisit(
      db,
      makeSettings({ uiLanguage: "sv", theme: "dark" }),
      env,
    );

    expect(await loadSettings(db)).toMatchObject({
      uiLanguage: "sv",
      theme: "dark",
    });
  });

  it("FR-SET-1: does not seed twice", async () => {
    await seedFirstVisit(db, makeSettings(), env);

    expect(await seedFirstVisit(db, makeSettings(), env)).toBe(false);
    expect((await loadLibrary(db)).sets).toHaveLength(1);
  });

  it("FR-SET-1: does not bring the example back after the user deleted every set", async () => {
    await saveSettings(db, makeSettings());

    expect(await seedFirstVisit(db, makeSettings(), env)).toBe(false);
    expect((await loadLibrary(db)).sets).toEqual([]);
  });

  it("FR-SET-1: does not add the example next to existing sets", async () => {
    await putSet(db, makeSet());

    expect(await seedFirstVisit(db, makeSettings(), env)).toBe(false);
    expect((await loadLibrary(db)).sets).toHaveLength(1);
  });
});
