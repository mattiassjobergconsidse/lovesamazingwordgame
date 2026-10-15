import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseProvider } from "../components/common/DatabaseProvider";
import { LibraryProvider } from "../components/common/LibraryProvider";
import { SettingsProvider } from "../components/common/SettingsProvider";
import {
  deleteAppDatabase,
  makeProgress,
  makeSettings,
} from "../../tests/factories";
import { readLibrary, seedDatabase, setWithPairs } from "../../tests/seed";
import { useDatabase } from "./useDatabase";
import { useLibrary } from "./useLibrary";
import { useSettings } from "./useSettings";

function Wrapper({ children }: { readonly children: ReactNode }) {
  return (
    <DatabaseProvider>
      <SettingsProvider>
        <LibraryProvider>{children}</LibraryProvider>
      </SettingsProvider>
    </DatabaseProvider>
  );
}

async function renderLibrary() {
  const view = renderHook(
    () => ({
      library: useLibrary(),
      settings: useSettings(),
      storageError: useDatabase().storageError,
    }),
    { wrapper: Wrapper },
  );
  await waitFor(() => {
    expect(view.result.current.library.status).toBe("ready");
    expect(view.result.current.settings.ready).toBe(true);
  });
  return view;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  await deleteAppDatabase();
});

const fields = { name: "Week 1", langA: "Svenska", langB: "English" };

describe("useLibraryStore sets", () => {
  it("FR-SET-1: returns validation errors instead of creating an invalid set", async () => {
    await seedDatabase({});
    const { result } = await renderLibrary();

    let created:
      ReturnType<typeof result.current.library.createSet> | undefined;
    act(() => {
      created = result.current.library.createSet({ ...fields, name: " " });
    });

    expect(created).toEqual({ ok: false, errors: { name: "required" } });
    expect(result.current.library.sets).toEqual([]);
  });

  it("FR-SET-2: reports an unknown set instead of throwing", async () => {
    await seedDatabase({});
    const { result } = await renderLibrary();

    expect(result.current.library.updateSet("missing", fields)).toEqual({
      ok: false,
      errors: {},
    });
  });

  it("FR-SET-4: returns null when duplicating an unknown set", async () => {
    await seedDatabase({});
    const { result } = await renderLibrary();

    expect(result.current.library.duplicateSet("missing", "Copy")).toBeNull();
  });

  it("FR-SET-3: deleting the active set clears the active set id", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    const { result } = await renderLibrary();

    act(() => {
      result.current.library.deleteSet(set.id);
    });

    expect(result.current.settings.settings.activeSetId).toBeNull();
    expect(result.current.library.pairs).toEqual([]);
    await waitFor(async () => {
      expect((await readLibrary()).sets).toEqual([]);
    });
  });
});

describe("useLibraryStore pairs", () => {
  it("FR-SET-6: ignores empty rows and unknown pairs", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({ sets: [set], pairs });
    const { result } = await renderLibrary();
    const { library } = result.current;

    expect(library.addPair(set.id, { a: "hus", b: " ; " })).toBeNull();
    expect(library.addParsedPairs(set.id, [])).toEqual([]);
    expect(library.updatePair("missing", { a: "a", b: "b" })).toBe(false);
    expect(library.updatePair(pairs[0]?.id ?? "", { a: "", b: "b" })).toBe(
      false,
    );
    expect(library.removePair("missing")).toBeNull();
    expect(result.current.library.pairs).toHaveLength(1);
  });

  it("FR-SET-6: restores a removed pair that had no progress", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({ sets: [set], pairs });
    const { result } = await renderLibrary();

    let removed: ReturnType<typeof result.current.library.removePair> = null;
    act(() => {
      removed = result.current.library.removePair(pairs[0]?.id ?? "");
    });
    expect(removed).toMatchObject({ progress: null });
    act(() => {
      if (removed !== null) {
        result.current.library.restorePair(removed);
      }
    });

    expect(result.current.library.pairs).toHaveLength(1);
    await waitFor(async () => {
      expect((await readLibrary()).pairs).toHaveLength(1);
    });
  });

  it("FR-SET-6: keeps the progress when a pair is edited and restores it with Undo", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    const progress = makeProgress({
      pairId: pairs[0]?.id ?? "",
      setId: set.id,
      box: 3,
    });
    await seedDatabase({ sets: [set], pairs, progress: [progress] });
    const { result } = await renderLibrary();

    act(() => {
      result.current.library.updatePair(pairs[0]?.id ?? "", {
        a: "hus",
        b: "home; house",
      });
    });
    expect(result.current.library.progress).toEqual([progress]);
    expect(result.current.library.pairs[0]).toMatchObject({
      b: "home",
      altB: ["house"],
    });

    let removed: ReturnType<typeof result.current.library.removePair> = null;
    act(() => {
      removed = result.current.library.removePair(pairs[0]?.id ?? "");
    });
    expect(result.current.library.progress).toEqual([]);
    act(() => {
      if (removed !== null) {
        result.current.library.restorePair(removed);
      }
    });
    expect(result.current.library.progress).toEqual([progress]);
  });
});

describe("useLibraryStore storage problems", () => {
  it("FR-BP-4: keeps the change in memory and reports a failed write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await seedDatabase({});
    const { result } = await renderLibrary();
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    act(() => {
      result.current.library.createSet(fields);
    });

    expect(result.current.library.sets).toHaveLength(1);
    await waitFor(() => {
      expect(result.current.storageError).toBe("failed");
    });
  });

  it("FR-BP-4: reports a failed read and stays in the loading state", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await seedDatabase({});
    vi.spyOn(IDBObjectStore.prototype, "getAll").mockImplementation(() => {
      throw new DOMException("broken", "UnknownError");
    });

    const { result } = renderHook(
      () => ({
        library: useLibrary(),
        storageError: useDatabase().storageError,
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.storageError).toBe("failed");
    });
    expect(result.current.library.status).toBe("loading");
  });

  it("FR-BP-4: works in memory when IndexedDB is unavailable", () => {
    vi.stubGlobal("indexedDB", undefined);
    const { result } = renderHook(() => useLibrary(), { wrapper: Wrapper });

    expect(result.current.status).toBe("ready");
    act(() => {
      result.current.createSet(fields);
    });

    expect(result.current.sets).toHaveLength(1);
  });
});
