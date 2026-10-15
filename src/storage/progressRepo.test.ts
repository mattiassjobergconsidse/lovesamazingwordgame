import { afterEach, describe, expect, it } from "vitest";
import { deleteAppDatabase, makeProgress } from "../../tests/factories";
import { openAppDb } from "./db";
import { saveAnswer } from "./progressRepo";

afterEach(async () => {
  await deleteAppDatabase();
});

describe("saveAnswer", () => {
  it("FR-TRN-4: stores the progress and creates the daily activity", async () => {
    const db = await openAppDb();
    const progress = makeProgress({ pairId: "p1", setId: "s1", box: 2 });

    await saveAnswer(db, progress, "2026-01-05", "correct");

    expect(await db.get("progress", "p1")).toEqual(progress);
    expect(await db.get("activity", "s1:2026-01-05")).toEqual({
      id: "s1:2026-01-05",
      setId: "s1",
      date: "2026-01-05",
      answered: 1,
      correct: 1,
    });
    db.close();
  });

  it("FR-TRN-4: accumulates several answers on the same day", async () => {
    const db = await openAppDb();

    await saveAnswer(
      db,
      makeProgress({ pairId: "p1", setId: "s1" }),
      "2026-01-05",
      "correct",
    );
    await saveAnswer(
      db,
      makeProgress({ pairId: "p2", setId: "s1" }),
      "2026-01-05",
      "wrong",
    );

    expect(await db.get("activity", "s1:2026-01-05")).toMatchObject({
      answered: 2,
      correct: 1,
    });
    db.close();
  });

  it("FR-TRN-4: overwrites the earlier progress of the same word", async () => {
    const db = await openAppDb();

    await saveAnswer(
      db,
      makeProgress({ pairId: "p1", setId: "s1", box: 1 }),
      "2026-01-05",
      "correct",
    );
    await saveAnswer(
      db,
      makeProgress({ pairId: "p1", setId: "s1", box: 3 }),
      "2026-01-06",
      "correct",
    );

    expect(await db.get("progress", "p1")).toMatchObject({ box: 3 });
    expect(await db.getAll("activity")).toHaveLength(2);
    db.close();
  });
});
