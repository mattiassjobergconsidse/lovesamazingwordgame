import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { TROPHY_DEFINITIONS } from "../src/core/trophyDefinitions";
import { deleteAppDatabase, makeSettings } from "./factories";
import { readTrophies, seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "#/trophies";
});

afterEach(async () => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedOneWord(trophies: Parameters<typeof seedDatabase>[0] = {}) {
  const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({ activeSetId: set.id, directionMode: "AtoB" }),
    ...trophies,
  });
}

async function finishFlashcardSession(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(await screen.findByRole("button", { name: "Start" }));
  await user.click(await screen.findByRole("button", { name: "Show answer" }));
  await user.click(screen.getByRole("button", { name: "I knew it" }));
  await screen.findByRole("heading", { name: "Session complete" });
}

describe("trophy screen", () => {
  it("NH-10: shows every trophy locked with its requirement at the start", async () => {
    await seedOneWord();
    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Trophies" }),
    ).toBeVisible();
    expect(screen.getByText("0 of 16 trophies unlocked")).toBeVisible();
    const list = screen.getByRole("list", { name: "Trophy list" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(
      TROPHY_DEFINITIONS.length,
    );
    const streak = screen.getByTestId("trophy-streak7");
    expect(within(streak).getByText("Week warrior")).toBeVisible();
    expect(within(streak).getByText("Locked")).toBeVisible();
    expect(within(streak).getByText("Practise 7 days in a row.")).toBeVisible();
    const mode = screen.getByTestId("trophy-modeHangman");
    expect(
      within(mode).getByText("Complete a session of Hangman."),
    ).toBeVisible();
  });

  it("NH-10: shows unlocked trophies with their date and keeps the others locked", async () => {
    await seedOneWord({
      trophies: [
        { id: "firstSession", unlockedAt: new Date(2026, 9, 15, 12).getTime() },
      ],
    });
    render(<App />);

    expect(await screen.findByText("1 of 16 trophies unlocked")).toBeVisible();
    const first = screen.getByTestId("trophy-firstSession");
    expect(within(first).getByText(/^Unlocked on .*2026$/)).toBeVisible();
    expect(within(first).queryByText("Locked")).toBeNull();
    expect(
      within(screen.getByTestId("trophy-streak3")).getByText("Locked"),
    ).toBeVisible();
  });

  it("NH-10: is translated to Swedish", async () => {
    const { set } = setWithPairs("Vecka 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      settings: makeSettings({ uiLanguage: "sv", activeSetId: set.id }),
    });
    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Troféer" }),
    ).toBeVisible();
    expect(screen.getByText("0 av 16 troféer upplåsta")).toBeVisible();
    expect(
      within(screen.getByTestId("trophy-streak3")).getByText("Låst"),
    ).toBeVisible();
  });

  it("NH-10: is reachable from the main navigation", async () => {
    window.location.hash = "#/";
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("link", { name: "Trophies" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Trophies" }),
    ).toBeVisible();
  });

  it("FR-BP-11: has no accessibility violations", async () => {
    await seedOneWord({
      trophies: [{ id: "firstSession", unlockedAt: 1000 }],
    });
    const { container } = render(<App />);
    await screen.findByText("1 of 16 trophies unlocked");

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("unlocking trophies", () => {
  it("NH-10: finishing a first session celebrates and stores the new trophies", async () => {
    window.location.hash = "#/train/flashcards";
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);

    await finishFlashcardSession(user);

    expect(
      await screen.findByText(
        "Trophies unlocked: 🏁 First steps, 🃏 Card collector",
      ),
    ).toBeVisible();
    const stored = await readTrophies();
    expect(stored.map((record) => record.id).sort()).toEqual([
      "firstSession",
      "modeFlashcards",
    ]);
    expect(stored.every((record) => record.unlockedAt > 0)).toBe(true);
  });

  it("NH-10: unlocked trophies appear on the trophy screen without reloading", async () => {
    window.location.hash = "#/train/flashcards";
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);
    await finishFlashcardSession(user);

    await user.click(screen.getByRole("link", { name: "Trophies" }));

    expect(await screen.findByText("2 of 16 trophies unlocked")).toBeVisible();
    expect(
      within(screen.getByTestId("trophy-modeFlashcards")).queryByText("Locked"),
    ).toBeNull();
  });

  it("NH-10: does not celebrate a trophy that is already unlocked", async () => {
    window.location.hash = "#/train/flashcards";
    await seedOneWord({
      trophies: [
        { id: "firstSession", unlockedAt: 1000 },
        { id: "modeFlashcards", unlockedAt: 1000 },
      ],
    });
    const user = userEvent.setup();
    render(<App />);

    await finishFlashcardSession(user);

    expect(screen.queryByText(/unlocked:/)).toBeNull();
    expect(await readTrophies()).toHaveLength(2);
  });

  it("NH-10: a single new trophy is announced in the singular", async () => {
    window.location.hash = "#/train/flashcards";
    await seedOneWord({
      trophies: [{ id: "firstSession", unlockedAt: 1000 }],
    });
    const user = userEvent.setup();
    render(<App />);

    await finishFlashcardSession(user);

    expect(
      await screen.findByText("Trophy unlocked: 🃏 Card collector"),
    ).toBeVisible();
  });
});
