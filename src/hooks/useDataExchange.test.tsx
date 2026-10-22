import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseProvider } from "../components/common/DatabaseProvider";
import { LibraryProvider } from "../components/common/LibraryProvider";
import { SettingsProvider } from "../components/common/SettingsProvider";
import { deleteAppDatabase, makeSettings } from "../../tests/factories";
import { seedDatabase, setWithPairs } from "../../tests/seed";
import * as fileIo from "../storage/fileIo";
import * as exportImport from "../storage/exportImport";
import { useDatabase } from "./useDatabase";
import { useDataExchange } from "./useDataExchange";
import { useSettings } from "./useSettings";

vi.mock("../storage/fileIo", async (importOriginal) => {
  const actual = await importOriginal<typeof fileIo>();
  return {
    ...actual,
    downloadTextFile: vi.fn(),
    readFileText: vi.fn(actual.readFileText),
  };
});

vi.mock("../storage/exportImport", async (importOriginal) => {
  const actual = await importOriginal<typeof exportImport>();
  return {
    ...actual,
    applyImportPlan: vi.fn(actual.applyImportPlan),
    clearLibrary: vi.fn(actual.clearLibrary),
  };
});

function Wrapper({ children }: { readonly children: ReactNode }) {
  return (
    <DatabaseProvider>
      <SettingsProvider>
        <LibraryProvider>{children}</LibraryProvider>
      </SettingsProvider>
    </DatabaseProvider>
  );
}

function renderExchange() {
  return renderHook(
    () => ({
      exchange: useDataExchange(),
      settings: useSettings(),
      storageError: useDatabase().storageError,
    }),
    { wrapper: Wrapper },
  );
}

async function renderReady() {
  const view = renderExchange();
  await waitFor(() => {
    expect(view.result.current.exchange.ready).toBe(true);
    expect(view.result.current.settings.ready).toBe(true);
  });
  return view;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(fileIo.downloadTextFile).mockClear();
  localStorage.clear();
  await deleteAppDatabase();
});

describe("useDataExchange", () => {
  it("FR-IO-1: does nothing when exporting an unknown set", async () => {
    await seedDatabase({});
    const { result } = await renderReady();

    act(() => {
      result.current.exchange.exportSet("missing", false);
      result.current.exchange.exportCsv("missing");
    });

    expect(fileIo.downloadTextFile).not.toHaveBeenCalled();
  });

  it("FR-IO-1: downloads a set and everything", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({ sets: [set], pairs });
    const { result } = await renderReady();

    act(() => {
      result.current.exchange.exportSet(set.id, true);
      result.current.exchange.exportAll(false);
      result.current.exchange.exportCsv(set.id);
    });

    expect(fileIo.downloadTextFile).toHaveBeenCalledTimes(3);
  });

  it("FR-IO-2: reports an unreadable file", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await seedDatabase({});
    const { result } = await renderReady();
    vi.mocked(fileIo.readFileText).mockRejectedValueOnce(new Error("nope"));

    const draft = await result.current.exchange.readImportFile(
      new File(["x"], "broken.csv"),
    );

    expect(draft).toEqual({
      ok: false,
      problems: [{ path: "broken.csv", reason: "unreadable" }],
    });
  });

  it("FR-IO-2: rejects a file over the size limit without reading it", async () => {
    await seedDatabase({});
    const { result } = await renderReady();
    const file = new File(["x"], "huge.json");
    Object.defineProperty(file, "size", {
      value: fileIo.MAX_IMPORT_FILE_BYTES + 1,
    });
    vi.mocked(fileIo.readFileText).mockClear();

    const draft = await result.current.exchange.readImportFile(file);

    expect(draft).toEqual({
      ok: false,
      problems: [{ path: "huge.json", reason: "tooLarge" }],
    });
    expect(fileIo.readFileText).not.toHaveBeenCalled();
  });

  it("FR-IO-2: returns the problems of an invalid JSON or CSV file", async () => {
    await seedDatabase({});
    const { result } = await renderReady();
    vi.mocked(fileIo.readFileText)
      .mockResolvedValueOnce("{oops")
      .mockResolvedValueOnce("");

    const json = await result.current.exchange.readImportFile(
      new File(["x"], "a.json"),
    );
    const csv = await result.current.exchange.readImportFile(
      new File(["x"], "a.csv"),
    );

    expect(json.ok).toBe(false);
    expect(csv.ok).toBe(false);
  });

  it("FR-IO-2: reads a valid CSV file into one set", async () => {
    await seedDatabase({});
    const { result } = await renderReady();
    vi.mocked(fileIo.readFileText).mockResolvedValueOnce(
      "Svenska,English\nhus,house\n",
    );

    const draft = await result.current.exchange.readImportFile(
      new File(["x"], "words.csv"),
    );

    expect(draft.ok && draft.bundles).toHaveLength(1);
  });

  it("FR-IO-2: imports a draft and makes the first new set active", async () => {
    await seedDatabase({});
    const { result } = await renderReady();
    vi.mocked(fileIo.readFileText).mockResolvedValueOnce(
      "Svenska,English\nhus,house\n",
    );
    const draft = await result.current.exchange.readImportFile(
      new File(["x"], "words.csv"),
    );
    if (!draft.ok) {
      throw new Error("expected a valid draft");
    }

    let count: number | null = null;
    await act(async () => {
      count = await result.current.exchange.commitImport(
        draft.bundles,
        new Map(),
      );
    });

    expect(count).toBe(1);
    expect(result.current.settings.settings.activeSetId).not.toBeNull();
  });

  it("FR-IO-2: keeps the active set when importing next to it", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    const { result } = await renderReady();
    vi.mocked(fileIo.readFileText).mockResolvedValueOnce(
      "Svenska,English\nbil,car\n",
    );
    const draft = await result.current.exchange.readImportFile(
      new File(["x"], "other.csv"),
    );
    if (!draft.ok) {
      throw new Error("expected a valid draft");
    }

    await act(async () => {
      await result.current.exchange.commitImport(draft.bundles, new Map());
    });

    expect(result.current.settings.settings.activeSetId).toBe(set.id);
  });

  it("FR-BP-4: reports a failed import and a failed reset", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await seedDatabase({});
    const { result } = await renderReady();
    vi.mocked(exportImport.applyImportPlan).mockRejectedValueOnce(
      new Error("boom"),
    );
    vi.mocked(exportImport.clearLibrary).mockRejectedValueOnce(
      new Error("boom"),
    );

    let imported: number | null = 0;
    let reset = true;
    await act(async () => {
      imported = await result.current.exchange.commitImport([], new Map());
      reset = await result.current.exchange.resetAll();
    });

    expect(imported).toBeNull();
    expect(reset).toBe(false);
    expect(result.current.storageError).toBe("failed");
  });

  it("FR-IO-4: resets all data and clears the active set", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    const { result } = await renderReady();

    let reset = false;
    await act(async () => {
      reset = await result.current.exchange.resetAll();
    });

    expect(reset).toBe(true);
    expect(result.current.settings.settings.activeSetId).toBeNull();
  });

  it("FR-BP-4: refuses to import or reset without a database", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const { result } = renderExchange();

    let imported: number | null = 0;
    let reset = true;
    await act(async () => {
      imported = await result.current.exchange.commitImport([], new Map());
      reset = await result.current.exchange.resetAll();
    });

    expect(imported).toBeNull();
    expect(reset).toBe(false);
  });
});
