import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteAppDatabase } from "../../tests/factories";
import { loadBestScore, saveBestScore } from "./bestScoresRepo";
import { openAppDb, type WordGameDatabase } from "./db";

let db: WordGameDatabase;

beforeEach(async () => {
  db = await openAppDb();
});

afterEach(async () => {
  db.close();
  await deleteAppDatabase();
});

describe("bestScoresRepo", () => {
  it("NH-16: has no best score for a set that was never played", async () => {
    expect(await loadBestScore(db, "set-1")).toBeNull();
  });

  it("NH-16: stores a first score and reads it back", async () => {
    const stored = await saveBestScore(db, {
      setId: "set-1",
      score: 120,
      achievedAt: 1,
    });

    expect(stored).toBe(true);
    expect(await loadBestScore(db, "set-1")).toBe(120);
  });

  it("NH-16: keeps the higher score when a lower one arrives", async () => {
    await saveBestScore(db, { setId: "set-1", score: 120, achievedAt: 1 });

    const stored = await saveBestScore(db, {
      setId: "set-1",
      score: 90,
      achievedAt: 2,
    });

    expect(stored).toBe(false);
    expect(await loadBestScore(db, "set-1")).toBe(120);
  });

  it("NH-16: replaces the score with a higher one", async () => {
    await saveBestScore(db, { setId: "set-1", score: 120, achievedAt: 1 });
    await saveBestScore(db, { setId: "set-1", score: 150, achievedAt: 2 });

    expect(await loadBestScore(db, "set-1")).toBe(150);
  });

  it("NH-16: keeps scores of different sets apart", async () => {
    await saveBestScore(db, { setId: "set-1", score: 120, achievedAt: 1 });
    await saveBestScore(db, { setId: "set-2", score: 40, achievedAt: 1 });

    expect(await loadBestScore(db, "set-2")).toBe(40);
  });

  it("NH-16: ignores a damaged record", async () => {
    await db.put("bestScores", { setId: "set-1", score: "lots" } as never);

    expect(await loadBestScore(db, "set-1")).toBeNull();
  });

  it("NH-16: replaces a damaged record with a valid score", async () => {
    await db.put("bestScores", { setId: "set-1", score: -5 } as never);

    const stored = await saveBestScore(db, {
      setId: "set-1",
      score: 10,
      achievedAt: 1,
    });

    expect(stored).toBe(true);
    expect(await loadBestScore(db, "set-1")).toBe(10);
  });
});
