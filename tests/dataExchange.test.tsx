import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { buildExport } from "../src/core/exportFormat";
import { openAppDb } from "../src/storage/db";
import {
  deleteAppDatabase,
  makePair,
  makeProgress,
  makeSet,
  makeSettings,
} from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

interface Download {
  readonly fileName: string;
  readonly blob: Blob;
}

let downloads: Download[];

beforeEach(() => {
  downloads = [];
  let pendingBlob: Blob | undefined;
  Object.assign(URL, {
    createObjectURL: vi.fn((blob: Blob) => {
      pendingBlob = blob;
      return "blob:test";
    }),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    if (pendingBlob !== undefined) {
      downloads.push({ fileName: this.download, blob: pendingBlob });
    }
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function renderApp() {
  const view = render(<App />);
  // Export, import and reset stay disabled until the library is loaded.
  await waitFor(() => {
    expect(document.querySelectorAll(".data-panel :disabled")).toHaveLength(0);
  });
  return view;
}

async function rawText(blob: Blob): Promise<string> {
  // Blob.text() drops a byte order mark, which the CSV export must keep.
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(
    await blob.arrayBuffer(),
  );
}

async function seedWeek() {
  const { set, pairs } = setWithPairs("Week 1", [
    ["hus", "house"],
    ["blå", "blue"],
  ]);
  const progress = pairs.map((pair) =>
    makeProgress({ pairId: pair.id, setId: set.id, box: 3, correct: 2 }),
  );
  await seedDatabase({
    sets: [set],
    pairs,
    progress,
    activity: [
      {
        id: `${set.id}:2026-10-15`,
        setId: set.id,
        date: "2026-10-15",
        answered: 2,
        correct: 2,
      },
    ],
    settings: makeSettings({ activeSetId: set.id }),
  });
  return { set, pairs };
}

function jsonFile(name: string, setName: string, terms: [string, string][]) {
  const set = makeSet({ name: setName });
  const pairs = terms.map(([a, b]) => makePair({ setId: set.id, a, b }));
  const file = buildExport(
    { sets: [set], pairs, progress: [], activity: [] },
    [set.id],
    false,
    0,
  );
  return new File([JSON.stringify(file)], name, { type: "application/json" });
}

describe("export", () => {
  it("FR-IO-1: exports all data as a JSON backup including progress", async () => {
    window.location.hash = "#/settings";
    const { set } = await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Export all data" }),
    );

    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.fileName).toMatch(
      /^lovesamazingwordgame-backup-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const content: unknown = JSON.parse(
      (await downloads[0]?.blob.text()) ?? "",
    );
    expect(content).toMatchObject({
      formatVersion: 1,
      sets: [{ id: set.id, name: "Week 1" }],
      pairs: [{ a: "hus" }, { a: "blå" }],
      progress: [{ box: 3 }, { box: 3 }],
      activity: [{ answered: 2 }],
    });
  });

  it("FR-IO-1: leaves progress out when the checkbox is cleared", async () => {
    window.location.hash = "#/settings";
    await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      await screen.findByRole("checkbox", {
        name: "Include progress and statistics",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Export all data" }));

    const content: unknown = JSON.parse(
      (await downloads[0]?.blob.text()) ?? "",
    );
    expect(content).not.toHaveProperty("progress");
    expect(content).not.toHaveProperty("activity");
  });

  it("FR-IO-1: exports one set from the editor under its own name", async () => {
    const { set } = await seedWeek();
    window.location.hash = `#/sets/${set.id}`;
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Export as JSON" }),
    );

    expect(downloads[0]?.fileName).toBe("week-1.json");
  });

  it("FR-IO-3: exports one set as CSV with a header and a byte order mark", async () => {
    const { set } = await seedWeek();
    window.location.hash = `#/sets/${set.id}`;
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Export as CSV" }),
    );

    expect(downloads[0]?.fileName).toBe("week-1.csv");
    expect(await rawText(downloads[0]?.blob ?? new Blob())).toBe(
      "\uFEFFSvenska,English\r\nhus,house\r\nblå,blue\r\n",
    );
  });
});

describe("import", () => {
  beforeEach(() => {
    window.location.hash = "#/sets";
  });

  it("FR-IO-2: imports a JSON file as a new set and confirms it", async () => {
    await seedDatabase({});
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      jsonFile("week2.json", "Week 2", [["bil", "car"]]),
    );

    expect(await screen.findByText("1 set imported")).toBeVisible();
    const library = await readLibrary();
    expect(library.sets.map((set) => set.name)).toEqual(["Week 2"]);
    expect(library.pairs.map((pair) => pair.a)).toEqual(["bil"]);
    const list = await screen.findByRole("list", { name: "Your sets" });
    expect(within(list).getByText("Week 2")).toBeVisible();
  });

  it("FR-IO-3: imports a CSV file as a set named after the file", async () => {
    await seedDatabase({});
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      new File(
        ["\uFEFFSvenska;English\r\nhus;house\r\nblå;blue\r\n"],
        "vecka3.csv",
        {
          type: "text/csv",
        },
      ),
    );

    expect(await screen.findByText("1 set imported")).toBeVisible();
    const library = await readLibrary();
    expect(library.sets).toMatchObject([
      { name: "vecka3", langA: "Svenska", langB: "English" },
    ]);
    expect(library.pairs.map((pair) => pair.b)).toEqual(["house", "blue"]);
    expect(library.progress).toEqual([]);
  });

  it("FR-IO-2: lists the problems of an invalid file and imports nothing", async () => {
    await seedDatabase({});
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      new File(
        ['{"formatVersion":1,"sets":[{"id":"s"}],"pairs":[]}'],
        "bad.json",
        {
          type: "application/json",
        },
      ),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The file cannot be imported:");
    expect(alert).toHaveTextContent(
      "sets[0].name: A required value is missing.",
    );
    expect((await readLibrary()).sets).toEqual([]);
  });

  it("FR-IO-3: lists the lines of an invalid CSV file", async () => {
    await seedDatabase({});
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      new File(["A,B\nonlyone\n"], "bad.csv", { type: "text/csv" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "line 2: A required value is missing.",
    );
    expect((await readLibrary()).sets).toEqual([]);
  });

  it("FR-IO-2: keeps both sets when renaming on a name conflict", async () => {
    await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      jsonFile("again.json", "Week 1", [["bil", "car"]]),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sets with the same name",
    });
    await user.click(within(dialog).getByRole("button", { name: "Import" }));

    await waitFor(async () => {
      expect((await readLibrary()).sets.map((set) => set.name).sort()).toEqual([
        "Week 1",
        "Week 1 (2)",
      ]);
    });
  });

  it("FR-IO-2: replaces the existing set, including its progress, and keeps it active", async () => {
    const { set } = await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      jsonFile("again.json", "Week 1", [["bil", "car"]]),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("radio", { name: "Replace the existing set" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Import" }));

    expect(await screen.findByText("1 set imported")).toBeVisible();
    const library = await readLibrary();
    expect(library.sets).toHaveLength(1);
    expect(library.sets[0]?.id).not.toBe(set.id);
    expect(library.pairs.map((pair) => pair.a)).toEqual(["bil"]);
    expect(library.progress).toEqual([]);
    expect(library.activity).toEqual([]);
    const db = await openAppDb();
    const stored = await db.get("settings", "settings");
    db.close();
    expect(stored?.activeSetId).toBe(library.sets[0]?.id);
  });

  it("FR-IO-2: skipping the only conflicting set imports nothing", async () => {
    await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      jsonFile("again.json", "Week 1", [["bil", "car"]]),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("radio", { name: "Skip" }));
    await user.click(within(dialog).getByRole("button", { name: "Import" }));

    expect(await screen.findByText("Nothing was imported")).toBeVisible();
    expect((await readLibrary()).sets).toHaveLength(1);
  });

  it("FR-IO-2: cancelling the conflict dialog imports nothing", async () => {
    await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.upload(
      await screen.findByLabelText("Import a JSON or CSV file"),
      jsonFile("again.json", "Week 1", [["bil", "car"]]),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect((await readLibrary()).sets).toHaveLength(1);
  });
});

describe("reset", () => {
  beforeEach(() => {
    window.location.hash = "#/settings";
  });

  it("FR-IO-4: needs the confirmation word before deleting everything", async () => {
    await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Reset all data…" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Reset all data?",
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Delete everything",
    });
    const field = within(dialog).getByLabelText(/Type RESET to confirm/);
    expect(confirm).toBeDisabled();

    await user.type(field, "reset");
    expect(confirm).toBeDisabled();
    await user.clear(field);
    await user.type(field, "RESET");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(await screen.findByText("All data was deleted")).toBeVisible();
    const library = await readLibrary();
    expect(library).toEqual({
      sets: [],
      pairs: [],
      progress: [],
      activity: [],
    });
    expect(screen.getByText("No set selected")).toBeVisible();
  });

  it("FR-IO-4: cancelling deletes nothing", async () => {
    await seedWeek();
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Reset all data…" }),
    );
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect((await readLibrary()).sets).toHaveLength(1);
  });

  it("FR-IO-4: uses the Swedish confirmation word in the Swedish UI", async () => {
    const { set } = setWithPairs("Vecka 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      settings: makeSettings({ uiLanguage: "sv", activeSetId: set.id }),
    });
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Nollställ all data…" }),
    );

    expect(
      await screen.findByLabelText(/Skriv NOLLSTÄLL för att bekräfta/),
    ).toBeVisible();
  });

  it("FR-BP-11: the settings screen has no accessibility violations", async () => {
    await seedWeek();
    const { container } = await renderApp();
    await screen.findByRole("button", { name: "Export all data" });

    expect(await axe(container)).toHaveNoViolations();
  });
});
