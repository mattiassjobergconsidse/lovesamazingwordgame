import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { openAppDb } from "../src/storage/db";
import { loadSettings } from "../src/storage/settingsRepo";
import {
  deleteAppDatabase,
  makePair,
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

async function renderEditor(terms: readonly (readonly [string, string])[]) {
  const { set, pairs } = setWithPairs("Week 1", terms);
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({ activeSetId: set.id }),
  });
  window.location.hash = `#/sets/${set.id}`;
  const user = userEvent.setup();
  const view = render(<App />);
  await screen.findByRole("heading", { level: 2, name: "Words" });
  return { user, set, pairs, ...view };
}

describe("adding pairs", () => {
  it("FR-SET-6: Enter moves A to B and saves from B, then focuses the next empty row", async () => {
    const { user } = await renderEditor([]);

    await user.type(screen.getByLabelText("Svenska, new word"), "hund{Enter}");
    expect(screen.getByLabelText("English, new word")).toHaveFocus();
    await user.type(screen.getByLabelText("English, new word"), "dog{Enter}");

    expect(screen.getByLabelText("Svenska, word 1")).toHaveValue("hund");
    expect(screen.getByLabelText("English, word 1")).toHaveValue("dog");
    expect(screen.getByLabelText("Svenska, new word")).toHaveValue("");
    expect(screen.getByLabelText("Svenska, new word")).toHaveFocus();
    await waitFor(async () => {
      expect((await readLibrary()).pairs).toMatchObject([
        { a: "hund", b: "dog" },
      ]);
    });
  });

  it("FR-SET-6: does not save an incomplete row", async () => {
    const { user } = await renderEditor([]);

    await user.type(screen.getByLabelText("Svenska, new word"), "hund");
    await user.tab();
    await user.tab();
    await user.tab({ shift: true });
    await user.type(screen.getByLabelText("English, new word"), "{Enter}");

    expect(screen.queryByLabelText("Svenska, word 1")).not.toBeInTheDocument();
    expect(screen.getByText(/No words yet/)).toBeInTheDocument();
  });

  it("FR-SET-6: saves a complete row when the focus leaves it and trims whitespace", async () => {
    const { user } = await renderEditor([]);

    await user.type(screen.getByLabelText("Svenska, new word"), "  båt ");
    await user.type(screen.getByLabelText("English, new word"), " boat  ");
    await user.click(screen.getByLabelText("Name"));

    expect(screen.getByLabelText("Svenska, word 1")).toHaveValue("båt");
    expect(screen.getByLabelText("English, word 1")).toHaveValue("boat");
  });

  it("FR-SET-7: stores alternatives after the main term and shows them again", async () => {
    const { user } = await renderEditor([]);

    await user.type(screen.getByLabelText("Svenska, new word"), "stor");
    await user.type(
      screen.getByLabelText("English, new word"),
      "big; large{Enter}",
    );

    expect(screen.getByLabelText("English, word 1")).toHaveValue("big; large");
    await waitFor(async () => {
      expect((await readLibrary()).pairs[0]).toMatchObject({
        b: "big",
        altB: ["large"],
      });
    });
  });
});

describe("editing pairs", () => {
  it("FR-SET-6: saves an edit on blur and keeps the progress of the pair", async () => {
    const { user, set, pairs } = await (async () => {
      const prepared = setWithPairs("Week 1", [["hus", "house"]]);
      await seedDatabase({
        sets: [prepared.set],
        pairs: prepared.pairs,
        progress: [
          makeProgress({
            pairId: prepared.pairs[0]?.id ?? "",
            setId: prepared.set.id,
            box: 4,
          }),
        ],
      });
      window.location.hash = `#/sets/${prepared.set.id}`;
      render(<App />);
      await screen.findByLabelText("English, word 1");
      return { user: userEvent.setup(), ...prepared };
    })();

    const english = screen.getByLabelText("English, word 1");
    await user.clear(english);
    await user.type(english, "home");
    await user.click(screen.getByLabelText("Name"));

    expect(english).toHaveValue("home");
    await waitFor(async () => {
      const library = await readLibrary();
      expect(library.pairs).toMatchObject([
        { id: pairs[0]?.id, setId: set.id, b: "home" },
      ]);
      expect(library.progress[0]).toMatchObject({ box: 4 });
    });
  });

  it("FR-SET-6: reverts an edit that empties a field", async () => {
    const { user } = await renderEditor([["hus", "house"]]);

    const swedish = screen.getByLabelText("Svenska, word 1");
    await user.clear(swedish);
    await user.click(screen.getByLabelText("Name"));

    expect(swedish).toHaveValue("hus");
  });

  it("FR-SET-6: Enter in the B field moves to the next row's A field", async () => {
    const { user } = await renderEditor([
      ["hus", "house"],
      ["bil", "car"],
    ]);

    await user.click(screen.getByLabelText("English, word 1"));
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("Svenska, word 2")).toHaveFocus();

    await user.click(screen.getByLabelText("English, word 2"));
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("Svenska, new word")).toHaveFocus();
  });

  it("FR-SET-6: Enter in an incomplete new row stays put", async () => {
    const { user } = await renderEditor([]);

    await user.type(screen.getByLabelText("Svenska, new word"), "hund{Enter}");
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("English, new word")).toHaveFocus();
    expect(screen.queryByLabelText("Svenska, word 1")).not.toBeInTheDocument();
  });
});

describe("removing pairs", () => {
  it("FR-SET-6: removes a pair and offers Undo that restores it with its position", async () => {
    const { user } = await renderEditor([
      ["hus", "house"],
      ["bil", "car"],
    ]);

    await user.click(screen.getByRole("button", { name: "Remove word 1" }));

    expect(screen.queryByDisplayValue("hus")).not.toBeInTheDocument();
    const toast = screen.getByRole("status", { name: "Notifications" });
    expect(toast).toHaveTextContent("Word removed");
    await waitFor(async () => {
      expect((await readLibrary()).pairs).toHaveLength(1);
    });

    await user.click(within(toast).getByRole("button", { name: "Undo" }));

    expect(screen.getByLabelText("Svenska, word 1")).toHaveValue("hus");
    expect(screen.getByLabelText("Svenska, word 2")).toHaveValue("bil");
    await waitFor(async () => {
      expect((await readLibrary()).pairs).toHaveLength(2);
    });
  });

  it("FR-SET-6: warns about a duplicate pair and removes it with one click", async () => {
    const { user } = await renderEditor([
      ["hus", "house"],
      ["HUS", "House"],
      ["bil", "car"],
    ]);

    expect(screen.getAllByText("Duplicate of an earlier word")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Remove duplicate" }));

    expect(screen.queryByDisplayValue("HUS")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("bil")).toBeInTheDocument();
    expect(
      screen.queryByText("Duplicate of an earlier word"),
    ).not.toBeInTheDocument();
  });
});

describe("bulk add", () => {
  it("FR-SET-8: previews valid and invalid lines and adds the valid ones", async () => {
    const { user } = await renderEditor([]);

    await user.click(screen.getByText("Add many words"));
    await user.click(screen.getByLabelText("Paste words, one pair per line"));
    await user.paste("hund\tdog\nkatt;cat\nhäst - horse\nnonsense");

    expect(screen.getByText("3 words ready to add")).toBeVisible();
    expect(
      screen.getByText(/Line 4: nonsense \(no separator found\)/),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add words" }));

    expect(screen.getByLabelText("Svenska, word 3")).toHaveValue("häst");
    expect(screen.getByLabelText("Paste words, one pair per line")).toHaveValue(
      "",
    );
    await waitFor(async () => {
      expect((await readLibrary()).pairs.map((pair) => pair.a)).toEqual([
        "hund",
        "katt",
        "häst",
      ]);
    });
  });

  it("FR-SET-8: disables Add while nothing valid is pasted", async () => {
    await renderEditor([]);

    expect(screen.getByRole("button", { name: "Add words" })).toBeDisabled();
  });
});

describe("searching pairs", () => {
  function manyTerms(count: number) {
    return Array.from(
      { length: count },
      (_, index) => [`ord${String(index)}`, `word${String(index)}`] as const,
    );
  }

  it("FR-SET-9: offers search only for sets with more than 20 words", async () => {
    await renderEditor(manyTerms(20));

    expect(screen.queryByLabelText("Search words")).not.toBeInTheDocument();
  });

  it("FR-SET-9: filters the rows while keeping their numbers", async () => {
    const { user } = await renderEditor(manyTerms(21));

    await user.type(screen.getByLabelText("Search words"), "word20");

    expect(screen.getByLabelText("English, word 21")).toHaveValue("word20");
    expect(screen.queryByLabelText("English, word 1")).not.toBeInTheDocument();
  });

  it("FR-SET-9: says when nothing matches", async () => {
    const { user } = await renderEditor(manyTerms(21));

    await user.type(screen.getByLabelText("Search words"), "zebra");

    expect(screen.getByText("No words match your search.")).toBeVisible();
  });
});

describe("storage failures", () => {
  it("FR-BP-4: tells the user when a change cannot be saved and keeps working in memory", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { user } = await renderEditor([]);
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    await user.type(screen.getByLabelText("Svenska, new word"), "hund");
    await user.type(screen.getByLabelText("English, new word"), "dog{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save your data",
    );
    expect(screen.getByLabelText("Svenska, word 1")).toHaveValue("hund");
  });
});

describe("training gate", () => {
  it("FR-ACT-1: asks for a set when training starts without one and continues after choosing", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({ sets: [set], pairs });
    window.location.hash = "#/train/quiz";
    const user = userEvent.setup();
    render(<App />);

    const dialog = await screen.findByRole("dialog", { name: "Choose a set" });
    await user.click(within(dialog).getByRole("button", { name: /Week 1/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Quiz");
    await waitFor(async () => {
      const db = await openAppDb();
      const stored = await loadSettings(db);
      db.close();
      expect(stored?.activeSetId).toBe(set.id);
    });
  });

  it("FR-ACT-1: lets the user reopen the picker after dismissing it", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({ sets: [set], pairs });
    window.location.hash = "#/train/flashcards";
    const user = userEvent.setup();
    render(<App />);
    const dialog = await screen.findByRole("dialog", { name: "Choose a set" });

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Choose set" }).at(-1) ??
        screen.getByRole("main"),
    );

    expect(
      await screen.findByRole("dialog", { name: "Choose a set" }),
    ).toBeInTheDocument();
  });

  it("FR-ACT-1: offers to create a set when there are none", async () => {
    await seedDatabase({});
    window.location.hash = "#/train";
    render(<App />);

    const dialog = await screen.findByRole("dialog", { name: "Choose a set" });

    expect(within(dialog).getByText("You have no sets yet.")).toBeVisible();
    expect(
      within(dialog).getByRole("link", { name: "Create a set" }),
    ).toHaveAttribute("href", "#/sets");
  });

  it("FR-ACT-1: disables Quiz and Matching with a message when the set has one word", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    window.location.hash = "#/train";
    render(<App />);

    expect(
      await screen.findByRole("link", { name: "Flashcards" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Writing" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Quiz" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Matching" })).toBeDisabled();
    expect(screen.getAllByText("Needs at least 2 words.")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Add words in the set editor" }),
    ).toHaveAttribute("href", `#/sets/${set.id}`);
  });

  it("FR-ACT-1: enables every mode once the set is big enough", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    window.location.hash = "#/train";
    render(<App />);

    expect(await screen.findByRole("link", { name: "Quiz" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Matching" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Add words in the set editor" }),
    ).not.toBeInTheDocument();
  });

  it("FR-ACT-1: blocks a mode screen opened directly when the set is too small", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    window.location.hash = "#/train/matching";
    render(<App />);

    expect(await screen.findByText("Needs at least 2 words.")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Matching",
    );
  });

  it("FR-ACT-2: changes the active set from the bar on any screen", async () => {
    const week1 = setWithPairs("Week 1", [["hus", "house"]]);
    const week2 = setWithPairs("Week 2", [["bil", "car"]]);
    await seedDatabase({
      sets: [week1.set, week2.set],
      pairs: [...week1.pairs, ...week2.pairs],
      settings: makeSettings({ activeSetId: week1.set.id }),
    });
    window.location.hash = "#/stats";
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("button", { name: /Week 2/ }));

    expect(
      within(screen.getByRole("region", { name: "Active set" })).getByRole(
        "link",
        { name: "Week 2" },
      ),
    ).toBeInTheDocument();
  });

  it("FR-ACT-2: ignores a stored active set id that no longer exists", async () => {
    await seedDatabase({ settings: makeSettings({ activeSetId: "gone" }) });
    render(<App />);

    expect(
      await screen.findByRole("button", { name: "Choose set" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Active set" }),
    ).toHaveTextContent("No set selected");
  });
});

describe("accessibility", () => {
  it("FR-BP-11: the set editor has no axe violations", async () => {
    const { container } = await renderEditor([
      ["hus", "house"],
      ["HUS", "house"],
    ]);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("FR-BP-11: the training mode picker has no axe violations in Swedish", async () => {
    const { set, pairs } = setWithPairs("Vecka 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id, uiLanguage: "sv" }),
    });
    window.location.hash = "#/train";
    const { container } = render(<App />);
    await screen.findByRole("button", { name: "Flerval" });

    expect(await axe(container)).toHaveNoViolations();
  });
});

// Keeps the unused-factory imports honest: pairs for another set must never leak into an editor.
describe("isolation", () => {
  it("FR-SET-6: shows only the pairs of the opened set", async () => {
    const week1 = setWithPairs("Week 1", [["hus", "house"]]);
    const other = makeSet({ name: "Other" });
    await seedDatabase({
      sets: [week1.set, other],
      pairs: [
        ...week1.pairs,
        makePair({ setId: other.id, a: "bil", b: "car" }),
      ],
    });
    window.location.hash = `#/sets/${week1.set.id}`;
    render(<App />);

    expect(await screen.findByLabelText("Svenska, word 1")).toHaveValue("hus");
    expect(screen.queryByDisplayValue("bil")).not.toBeInTheDocument();
  });
});
