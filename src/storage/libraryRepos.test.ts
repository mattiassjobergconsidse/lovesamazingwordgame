import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteAppDatabase,
  makePair,
  makeProgress,
  makeSet,
} from "../../tests/factories";
import { openAppDb, type WordGameDatabase } from "./db";
import {
  deletePairWithProgress,
  putPairs,
  restorePairWithProgress,
} from "./pairsRepo";
import {
  deleteSetCascade,
  loadLibrary,
  putSet,
  putSetWithPairs,
} from "./setsRepo";
import { runTransaction } from "./transaction";

let db: WordGameDatabase;

beforeEach(async () => {
  db = await openAppDb();
});

afterEach(async () => {
  db.close();
  await deleteAppDatabase();
});

describe("setsRepo", () => {
  it("FR-SET-1: stores a set and reads it back", async () => {
    const set = makeSet({ name: "Vecka 1" });

    await putSet(db, set);

    expect((await loadLibrary(db)).sets).toEqual([set]);
  });

  it("FR-SET-6: returns pairs in creation order", async () => {
    const first = makePair({ id: "z", createdAt: 1 });
    const second = makePair({ id: "a", createdAt: 2 });
    await putPairs(db, [second, first]);

    expect((await loadLibrary(db)).pairs.map((pair) => pair.id)).toEqual([
      "z",
      "a",
    ]);
  });

  it("FR-SET-4: stores a set with its pairs together", async () => {
    const set = makeSet();
    const pairs = [makePair({ setId: set.id }), makePair({ setId: set.id })];

    await putSetWithPairs(db, set, pairs);

    const library = await loadLibrary(db);
    expect(library.sets).toHaveLength(1);
    expect(library.pairs).toHaveLength(2);
  });

  it("FR-SET-4: rolls back the whole copy when one write fails", async () => {
    const set = makeSet();
    const good = makePair({ setId: set.id });
    // An object is not a valid IndexedDB key, so this put throws synchronously after the set was queued.
    const invalid = {
      ...makePair({ setId: set.id }),
      id: {} as unknown as string,
    };
    await expect(putSetWithPairs(db, set, [good, invalid])).rejects.toThrow();
    const library = await loadLibrary(db);
    expect(library.sets).toEqual([]);
    expect(library.pairs).toEqual([]);
  });
  it("FR-SET-3: deleting a set removes its pairs, progress and activity only", async () => {
    const doomed = makeSet();
    const kept = makeSet();
    const doomedPair = makePair({ setId: doomed.id });
    const keptPair = makePair({ setId: kept.id });
    await putSetWithPairs(db, doomed, [doomedPair]);
    await putSetWithPairs(db, kept, [keptPair]);
    await db.put(
      "progress",
      makeProgress({ pairId: doomedPair.id, setId: doomed.id }),
    );
    await db.put(
      "progress",
      makeProgress({ pairId: keptPair.id, setId: kept.id }),
    );
    await db.put("activity", {
      id: `${doomed.id}:2026-10-15`,
      setId: doomed.id,
      date: "2026-10-15",
      answered: 3,
      correct: 2,
    });

    await deleteSetCascade(db, doomed.id);

    const library = await loadLibrary(db);
    expect(library.sets).toEqual([kept]);
    expect(library.pairs).toEqual([keptPair]);
    expect(library.progress.map((record) => record.pairId)).toEqual([
      keptPair.id,
    ]);
    expect(await db.count("activity")).toBe(0);
  });

  it("FR-SET-3: deleting an unknown set changes nothing", async () => {
    const set = makeSet();
    await putSet(db, set);

    await deleteSetCascade(db, "missing");

    expect((await loadLibrary(db)).sets).toEqual([set]);
  });
});

describe("pairsRepo", () => {
  it("FR-SET-6: removing a pair also removes its progress, and restore brings both back", async () => {
    const pair = makePair();
    const progress = makeProgress({ pairId: pair.id, box: 3 });
    await putPairs(db, [pair]);
    await db.put("progress", progress);

    await deletePairWithProgress(db, pair.id);
    expect(await loadLibrary(db)).toMatchObject({ pairs: [], progress: [] });

    await restorePairWithProgress(db, pair, progress);
    expect(await loadLibrary(db)).toMatchObject({
      pairs: [pair],
      progress: [progress],
    });
  });

  it("FR-SET-6: restores a pair that never had progress", async () => {
    const pair = makePair();

    await restorePairWithProgress(db, pair, null);

    expect((await loadLibrary(db)).pairs).toEqual([pair]);
    expect(await db.count("progress")).toBe(0);
  });

  it("FR-SET-6: editing a pair text keeps the progress record", async () => {
    const pair = makePair({ a: "hus", b: "house" });
    await putPairs(db, [pair]);
    await db.put("progress", makeProgress({ pairId: pair.id, box: 4 }));

    await putPairs(db, [{ ...pair, b: "home", updatedAt: 2000 }]);

    const library = await loadLibrary(db);
    expect(library.pairs[0]?.b).toBe("home");
    expect(library.progress[0]?.box).toBe(4);
  });
});

describe("runTransaction", () => {
  it("FR-BP-4: aborts the transaction and rethrows when the work fails", async () => {
    const tx = db.transaction("sets", "readwrite");

    await expect(
      runTransaction(tx, (track) => {
        void track(tx.store.put(makeSet()));
        return Promise.reject(new Error("boom"));
      }),
    ).rejects.toThrow("boom");

    expect(await db.count("sets")).toBe(0);
  });

  it("FR-BP-4: tolerates a transaction that already finished", async () => {
    const tx = db.transaction("sets", "readwrite");
    await tx.done;

    await expect(
      runTransaction(tx, () => Promise.reject(new Error("late"))),
    ).rejects.toThrow("late");
  });
});
