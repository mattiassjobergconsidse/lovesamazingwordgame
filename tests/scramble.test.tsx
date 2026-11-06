import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "#/train/scramble";
});

afterEach(async () => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedWords(words: [string, string][]) {
  const { set, pairs } = setWithPairs("Week 1", words);
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({ activeSetId: set.id, directionMode: "AtoB" }),
  });
}

async function startSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Start" }));
}

describe("word scramble mode", () => {
  it("NH-13: shows the prompt, one tile per letter and an empty word", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);

    await startSession(user);

    expect(screen.getByText("Prompt (Svenska)")).toBeVisible();
    expect(screen.getByText("hus")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Your word: _____" }),
    ).toBeVisible();
    const tiles = within(screen.getByRole("list", { name: "Letter tiles" }));
    expect(
      tiles
        .getAllByRole("button")
        .map((tile) => tile.textContent)
        .sort()
        .join(""),
    ).toBe("ehosu");
  });

  it("NH-13: solves a word by tapping the tiles and records it as correct", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    const tiles = within(screen.getByRole("list", { name: "Letter tiles" }));

    for (const letter of Array.from("house")) {
      await user.click(tiles.getByRole("button", { name: letter }));
    }

    expect(screen.getByText("Correct! The word is house")).toBeVisible();
    // No auto-advance: the player continues with Next.
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByRole(
        "heading",
        { name: "Session complete" },
        { timeout: 3000 },
      ),
    ).toBeVisible();
    const { progress } = await readLibrary();
    expect(progress[0]).toMatchObject({ correct: 1, box: 1 });
  });

  it("NH-13: types letters on the physical keyboard and Backspace takes one back", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("hox");
    expect(
      screen.getByRole("group", { name: "Your word: ho___" }),
    ).toBeVisible();
    await user.keyboard("{Backspace}");
    expect(
      screen.getByRole("group", { name: "Your word: h____" }),
    ).toBeVisible();
    await user.keyboard("ouse");

    expect(screen.getByText("Correct! The word is house")).toBeVisible();
  });

  it("NH-13: tapping a placed letter takes it back and keeps focus on its tile", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    await user.keyboard("ho");

    await user.click(screen.getByRole("button", { name: "Take back h" }));

    expect(
      screen.getByRole("group", { name: "Your word: o____" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "Letter tiles" })).getByRole(
        "button",
        { name: "h" },
      ),
    ).toHaveFocus();
  });

  it("NH-13: a full row in the wrong order asks the player to fix it", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("esuoh");

    expect(
      screen.getByText("Not quite. Tap a letter to take it back."),
    ).toBeVisible();
    await user.keyboard(
      "{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}",
    );
    await user.keyboard("house");
    expect(screen.getByText("Correct! The word is house")).toBeVisible();
  });

  it("NH-13: a hint places the next correct letter and the result is assisted", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.click(screen.getByRole("button", { name: "Hint" }));
    expect(
      screen.getByRole("group", { name: "Your word: h____" }),
    ).toBeVisible();
    await user.keyboard("ouse");

    expect(
      screen.getByText("Solved with a hint. The word is house"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    // No auto-advance: the player reads the hint message and continues on purpose.
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
  });

  it("NH-13: giving up reveals the answer, records it as wrong and repeats the word", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.click(screen.getByRole("button", { name: "Give up" }));

    expect(screen.getByText("The word was: house")).toBeVisible();
    await user.keyboard("{Enter}");
    // FR-TRN-7: the missed word comes back once; the repeat does not change progress again.
    expect(
      await screen.findByRole("button", { name: "Give up" }),
    ).toBeVisible();
    await user.keyboard("house");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByRole(
        "heading",
        { name: "Session complete" },
        { timeout: 3000 },
      ),
    ).toBeVisible();
    const { progress } = await readLibrary();
    expect(progress[0]).toMatchObject({ wrong: 1, correct: 0, box: 1 });
  });

  it("NH-13: keeps word boundaries visible for multi-word answers", async () => {
    await seedWords([["glass", "ice cream"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("icec");

    expect(
      screen.getByRole("group", { name: "Your word: ice c____" }),
    ).toBeVisible();
    const tiles = within(screen.getByRole("list", { name: "Letter tiles" }));
    expect(tiles.getAllByRole("button")).toHaveLength(8);
  });

  it("NH-13: places å, ä and ö typed on the keyboard", async () => {
    await seedWords([["butter", "smör"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("o");
    expect(
      screen.getByRole("group", { name: "Your word: ____" }),
    ).toBeVisible();
    await user.keyboard("Ö");

    expect(
      screen.getByRole("group", { name: "Your word: ö___" }),
    ).toBeVisible();
  });

  it("NH-13: is available with a single word and has no axe violations", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    const { container } = render(<App />);

    await startSession(user);
    await user.keyboard("ho");

    expect(await axe(container)).toHaveNoViolations();
  });
});
