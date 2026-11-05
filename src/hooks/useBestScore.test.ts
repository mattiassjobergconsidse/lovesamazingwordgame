import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteAppDatabase } from "../../tests/factories";
import { loadBestScore } from "../storage/bestScoresRepo";
import { openAppDb, type WordGameDatabase } from "../storage/db";
import { DatabaseContext, type DatabaseStore } from "./databaseContext";
import { useBestScore } from "./useBestScore";

const openConnections: WordGameDatabase[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const db of openConnections.splice(0)) {
    db.close();
  }
  await deleteAppDatabase();
});

async function realDb(): Promise<WordGameDatabase> {
  const db = await openAppDb();
  openConnections.push(db);
  return db;
}

function renderBestScore(db: WordGameDatabase | null) {
  const reportStorageError = vi.fn();
  const store: DatabaseStore = { db, storageError: null, reportStorageError };
  const view = renderHook(() => useBestScore("set-1"), {
    wrapper: ({ children }: { readonly children: ReactNode }) =>
      createElement(DatabaseContext.Provider, { value: store }, children),
  });
  return { ...view, reportStorageError };
}

describe("useBestScore", () => {
  it("NH-16: reads the stored best score of the set", async () => {
    const db = await realDb();
    await db.put("bestScores", { setId: "set-1", score: 50, achievedAt: 1 });

    const { result } = renderBestScore(db);

    await waitFor(() => {
      expect(result.current).toMatchObject({ status: "ready", best: 50 });
    });
  });

  it("NH-16: reports no best score for a set that was never played", async () => {
    const { result } = renderBestScore(await realDb());

    await waitFor(() => {
      expect(result.current).toMatchObject({ status: "ready", best: null });
    });
  });

  it("NH-16: stores a submitted score without changing the score to beat", async () => {
    const db = await realDb();
    const { result } = renderBestScore(db);
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    act(() => {
      result.current.submit(70);
    });

    await waitFor(async () => {
      expect(await loadBestScore(db, "set-1")).toBe(70);
    });
    expect(result.current.best).toBeNull();
  });

  it("NH-16: waits while the database is not open and ignores submissions", () => {
    const { result } = renderBestScore(null);

    act(() => {
      result.current.submit(70);
    });

    expect(result.current).toMatchObject({ status: "loading", best: null });
  });

  it("NH-16: reports a storage error when the score cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing = {
      get: () => Promise.reject(new Error("read failed")),
    } as unknown as WordGameDatabase;

    const { result, reportStorageError } = renderBestScore(failing);

    await waitFor(() => {
      expect(result.current).toMatchObject({ status: "ready", best: null });
    });
    expect(reportStorageError).toHaveBeenCalledWith("failed");
  });

  it("NH-16: reports a storage error when the score cannot be saved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing = {
      get: () => Promise.resolve(undefined),
      transaction: () => {
        throw new Error("write failed");
      },
    } as unknown as WordGameDatabase;
    const { result, reportStorageError } = renderBestScore(failing);
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    act(() => {
      result.current.submit(70);
    });

    await waitFor(() => {
      expect(reportStorageError).toHaveBeenCalledWith("failed");
    });
  });
});
