import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { openAppDb } from "../src/storage/db";
import { loadSettings } from "../src/storage/settingsRepo";
import {
  deleteAppDatabase,
  makeProgress,
  makeSet,
  makeSettings,
} from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

describe("first visit", () => {
  it("FR-SET-1: creates the example set and makes it the active set", async () => {
    render(<App />);

    const bar = screen.getByRole("region", { name: "Active set" });
    expect(
      await within(bar).findByRole("link", { name: "Exempel: Vardagsord" }),
    ).toBeInTheDocument();
    expect(bar).toHaveTextContent("20 words");
    expect(within(bar).getByRole("button", { name: "Change" })).toBeVisible();
  });

  it("FR-ACT-2: shows no active set when the user has none", async () => {
    await seedDatabase({});
    render(<App />);

    const bar = screen.getByRole("region", { name: "Active set" });

    expect(bar).toHaveTextContent("No set selected");
    expect(
      within(bar).getByRole("button", { name: "Choose set" }),
    ).toBeInTheDocument();
  });

  it("FR-ACT-2: restores the active set after a reload", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });

    render(<App />);

    expect(
      await screen.findByRole("link", { name: "Week 1" }),
    ).toBeInTheDocument();
  });
});

describe("set list", () => {
  it("FR-SET-5: shows name, languages, word count, due count and last practised", async () => {
    const week1 = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    const week2 = setWithPairs("Week 2", [["hund", "dog"]]);
    const seenAt = Date.UTC(2026, 9, 10, 12);
    await seedDatabase({
      sets: [week1.set, week2.set],
      pairs: [...week1.pairs, ...week2.pairs],
      progress: [
        makeProgress({
          pairId: week1.pairs[0]?.id ?? "",
          setId: week1.set.id,
          dueAt: Date.now() + 86_400_000,
          lastSeenAt: seenAt,
        }),
      ],
      settings: makeSettings({ activeSetId: week1.set.id }),
    });
    window.location.hash = "#/sets";

    render(<App />);

    const list = await screen.findByRole("list", { name: "Your sets" });
    const [first, second] = within(list).getAllByRole("listitem");
    expect(first).toHaveTextContent("Week 1");
    expect(first).toHaveTextContent("Svenska → English");
    expect(first).toHaveTextContent("2 words");
    expect(first).toHaveTextContent("1 due");
    expect(first).toHaveTextContent("Last practised");
    expect(first).toHaveTextContent("Active");
    expect(second).toHaveTextContent("Week 2");
    expect(second).toHaveTextContent("Not practised yet");
  });

  it("FR-SET-5: shows a friendly empty state", async () => {
    await seedDatabase({});
    window.location.hash = "#/sets";

    render(<App />);

    expect(await screen.findByText("No sets yet")).toBeInTheDocument();
  });

  it("FR-ACT-2: makes another set active and persists it", async () => {
    const week1 = setWithPairs("Week 1", [["hus", "house"]]);
    const week2 = setWithPairs("Week 2", [["bil", "car"]]);
    await seedDatabase({
      sets: [week1.set, week2.set],
      pairs: [...week1.pairs, ...week2.pairs],
      settings: makeSettings({ activeSetId: week1.set.id }),
    });
    window.location.hash = "#/sets";
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Make Week 2 active" }),
    );

    expect(
      within(screen.getByRole("region", { name: "Active set" })).getByRole(
        "link",
        { name: "Week 2" },
      ),
    ).toBeInTheDocument();
    await waitFor(async () => {
      const db = await openAppDb();
      const stored = await loadSettings(db);
      db.close();
      expect(stored?.activeSetId).toBe(week2.set.id);
    });
  });
});

describe("creating a set", () => {
  async function renderSetsWithWeek1() {
    const week1 = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [week1.set],
      pairs: week1.pairs,
      settings: makeSettings({ activeSetId: week1.set.id }),
    });
    window.location.hash = "#/sets";
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("list", { name: "Your sets" });
    return user;
  }

  it("FR-SET-1: disables Save while the name is empty and pre-fills the last used labels", async () => {
    await renderSetsWithWeek1();

    expect(screen.getByRole("button", { name: "Create set" })).toBeDisabled();
    expect(screen.getByLabelText("Language A")).toHaveValue("Svenska");
    expect(screen.getByLabelText("Language B")).toHaveValue("English");
  });

  it("FR-SET-1: shows an inline error and disables Save for an empty label", async () => {
    const user = await renderSetsWithWeek1();

    await user.type(screen.getByLabelText("Name"), "Week 2");
    await user.clear(screen.getByLabelText("Language A"));
    await user.tab();

    expect(screen.getByText("This field is required")).toBeVisible();
    expect(screen.getByRole("button", { name: "Create set" })).toBeDisabled();
  });

  it("FR-SET-1: rejects a duplicate name ignoring case", async () => {
    const user = await renderSetsWithWeek1();

    await user.type(screen.getByLabelText("Name"), "  week 1");
    await user.tab();

    expect(
      screen.getByText("A set with this name already exists"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Create set" })).toBeDisabled();
  });

  it("FR-SET-1: creates the set, stores it and opens the editor", async () => {
    const user = await renderSetsWithWeek1();

    await user.type(screen.getByLabelText("Name"), "Week 2");
    await user.click(screen.getByRole("button", { name: "Create set" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Edit set" }),
    ).toBeInTheDocument();
    expect(window.location.hash).toMatch(/^#\/sets\/.+/);
    expect(screen.getByLabelText("Name")).toHaveValue("Week 2");
    await waitFor(async () => {
      expect((await readLibrary()).sets.map((set) => set.name)).toContain(
        "Week 2",
      );
    });
  });

  it("FR-SET-1: makes the first created set active when none is", async () => {
    await seedDatabase({});
    window.location.hash = "#/sets";
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("No sets yet");

    await user.type(screen.getByLabelText("Name"), "First");
    await user.type(screen.getByLabelText("Language A"), "Svenska");
    await user.type(screen.getByLabelText("Language B"), "English");
    await user.click(screen.getByRole("button", { name: "Create set" }));

    expect(
      await within(
        screen.getByRole("region", { name: "Active set" }),
      ).findByRole("link", { name: "First" }),
    ).toBeInTheDocument();
  });
});

describe("renaming a set", () => {
  it("FR-SET-2: autosaves name and labels and updates the active set bar immediately", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    window.location.hash = `#/sets/${set.id}`;
    const user = userEvent.setup();
    render(<App />);

    const name = await screen.findByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Spanish week");
    await user.clear(screen.getByLabelText("Language B"));
    await user.type(screen.getByLabelText("Language B"), "Español");

    expect(
      within(screen.getByRole("region", { name: "Active set" })).getByRole(
        "link",
        { name: "Spanish week" },
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Español, new word")).toBeInTheDocument();
    await waitFor(async () => {
      expect((await readLibrary()).sets[0]).toMatchObject({
        name: "Spanish week",
        langB: "Español",
      });
    });
  });

  it("FR-SET-2: keeps the stored name while the draft is invalid", async () => {
    const week1 = setWithPairs("Week 1", [["hus", "house"]]);
    const week2 = setWithPairs("Week 2", [["bil", "car"]]);
    await seedDatabase({
      sets: [week1.set, week2.set],
      pairs: [...week1.pairs, ...week2.pairs],
    });
    window.location.hash = `#/sets/${week2.set.id}`;
    const user = userEvent.setup();
    render(<App />);

    const name = await screen.findByLabelText("Name");
    await user.clear(name);
    await user.type(name, "week 1");

    expect(
      screen.getByText("A set with this name already exists"),
    ).toBeVisible();
    // "week" was a valid draft on the way and is saved; "week 1" never is.
    await waitFor(async () => {
      expect(
        (await readLibrary()).sets.find((set) => set.id === week2.set.id)?.name,
      ).toBe("week");
    });
  });

  it("shows a message and a way back for an unknown set", async () => {
    await seedDatabase({});
    window.location.hash = "#/sets/does-not-exist";
    render(<App />);

    expect(
      await screen.findByText("This set does not exist."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sets" })).toHaveAttribute(
      "href",
      "#/sets",
    );
  });
});

describe("deleting a set", () => {
  async function renderWithActiveWeek1() {
    const week1 = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    const week2 = setWithPairs("Week 2", [["hund", "dog"]]);
    const progress = makeProgress({
      pairId: week1.pairs[0]?.id ?? "",
      setId: week1.set.id,
    });
    await seedDatabase({
      sets: [week1.set, week2.set],
      pairs: [...week1.pairs, ...week2.pairs],
      progress: [progress],
      settings: makeSettings({ activeSetId: week1.set.id }),
    });
    window.location.hash = "#/sets";
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("list", { name: "Your sets" });
    return { user, week1, week2 };
  }

  it("FR-SET-3: asks for confirmation naming the set and its word count", async () => {
    const { user } = await renderWithActiveWeek1();

    await user.click(screen.getByRole("button", { name: "Delete Week 1" }));

    const dialog = screen.getByRole("dialog", { name: "Delete this set?" });
    expect(dialog).toHaveTextContent("“Week 1” with 2 words");
  });

  it("FR-SET-3: keeps everything when the user cancels", async () => {
    const { user } = await renderWithActiveWeek1();

    await user.click(screen.getByRole("button", { name: "Delete Week 1" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Your sets" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
  });

  it("FR-SET-3: deletes the set with pairs and progress and clears the active set", async () => {
    const { user, week1 } = await renderWithActiveWeek1();

    await user.click(screen.getByRole("button", { name: "Delete Week 1" }));
    await user.click(screen.getByRole("button", { name: "Delete set" }));

    expect(
      screen.getByRole("region", { name: "Active set" }),
    ).toHaveTextContent("No set selected");
    expect(
      within(screen.getByRole("list", { name: "Your sets" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);
    await waitFor(async () => {
      const library = await readLibrary();
      expect(library.sets.map((set) => set.name)).toEqual(["Week 2"]);
      expect(library.pairs.every((pair) => pair.setId !== week1.set.id)).toBe(
        true,
      );
      expect(library.progress).toEqual([]);
    });
    await waitFor(async () => {
      const db = await openAppDb();
      const stored = await loadSettings(db);
      db.close();
      expect(stored?.activeSetId).toBeNull();
    });
  });

  it("FR-SET-3: keeps the active set when another set is deleted", async () => {
    const { user } = await renderWithActiveWeek1();

    await user.click(screen.getByRole("button", { name: "Delete Week 2" }));
    await user.click(screen.getByRole("button", { name: "Delete set" }));

    expect(
      screen.getByRole("region", { name: "Active set" }),
    ).toHaveTextContent("Week 1");
  });
});

describe("duplicating a set", () => {
  it("FR-SET-4: copies the words but not the progress", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({
      sets: [set],
      pairs,
      progress: [
        makeProgress({
          pairId: pairs[0]?.id ?? "",
          setId: set.id,
          lastSeenAt: Date.now(),
        }),
      ],
    });
    window.location.hash = "#/sets";
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Duplicate Week 1" }),
    );

    const items = within(
      screen.getByRole("list", { name: "Your sets" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const copy = items.find((item) => item.textContent.includes("Copy of"));
    expect(copy).toHaveTextContent("Copy of Week 1");
    expect(copy).toHaveTextContent("2 words");
    expect(copy).toHaveTextContent("Not practised yet");
    await waitFor(async () => {
      const library = await readLibrary();
      expect(library.sets).toHaveLength(2);
      expect(library.pairs).toHaveLength(4);
      expect(library.progress).toHaveLength(1);
    });
  });

  it("FR-SET-4: finds a free name when the copy name is taken", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    const taken = makeSet({ name: "Copy of Week 1" });
    await seedDatabase({ sets: [set, taken], pairs });
    window.location.hash = "#/sets";
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Duplicate Week 1" }),
    );

    expect(
      screen.getByRole("link", { name: "Edit Copy of Week 1 (2)" }),
    ).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it("FR-BP-11: the set list has no axe violations", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    window.location.hash = "#/sets";
    const { container } = render(<App />);
    await screen.findByRole("list", { name: "Your sets" });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("FR-BP-11: the set picker dialog has no axe violations", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(await screen.findByRole("button", { name: "Change" }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
