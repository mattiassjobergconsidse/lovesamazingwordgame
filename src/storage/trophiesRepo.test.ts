import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteAppDatabase } from "../../tests/factories";
import { openAppDb, type WordGameDatabase } from "./db";
import { loadTrophies, putTrophies } from "./trophiesRepo";

let db: WordGameDatabase;

beforeEach(async () => {
  db = await openAppDb();
});

afterEach(async () => {
  db.close();
  await deleteAppDatabase();
});

describe("trophiesRepo", () => {
  it("NH-10: stores trophies and reads them back", async () => {
    await putTrophies(db, [
      { id: "firstSession", unlockedAt: 100 },
      { id: "streak3", unlockedAt: 200 },
    ]);

    expect(await loadTrophies(db)).toEqual([
      { id: "firstSession", unlockedAt: 100 },
      { id: "streak3", unlockedAt: 200 },
    ]);
  });

  it("NH-10: replaces a record with the same id", async () => {
    await putTrophies(db, [{ id: "streak3", unlockedAt: 200 }]);
    await putTrophies(db, [{ id: "streak3", unlockedAt: 100 }]);

    expect(await loadTrophies(db)).toEqual([
      { id: "streak3", unlockedAt: 100 },
    ]);
  });

  it("NH-10: is empty on a fresh database", async () => {
    expect(await loadTrophies(db)).toEqual([]);
  });

  it("NH-10: ignores records with an id from a newer version", async () => {
    await db.put("trophies", { id: "fromTheFuture", unlockedAt: 1 } as never);
    await putTrophies(db, [{ id: "streak3", unlockedAt: 200 }]);

    expect(await loadTrophies(db)).toEqual([
      { id: "streak3", unlockedAt: 200 },
    ]);
  });
});
