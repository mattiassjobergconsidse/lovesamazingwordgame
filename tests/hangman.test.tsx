import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "#/train/hangman";
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

describe("hangman mode", () => {
  it("NH-9: shows the prompt, blanks for the answer and the wrong guesses left", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);

    await startSession(user);

    expect(screen.getByText("Prompt (Svenska)")).toBeVisible();
    expect(screen.getByText("hus")).toBeVisible();
    expect(screen.getByRole("img", { name: "Word: _____" })).toBeVisible();
    expect(screen.getByText("Wrong guesses left: 6")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Hangman: 0 of 6 wrong guesses" }),
    ).toBeVisible();
  });

  it("NH-9: solves a word with the physical keyboard and records it as correct", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("hou");
    expect(screen.getByRole("img", { name: "Word: hou__" })).toBeVisible();
    await user.keyboard("se");

    expect(screen.getByText("Correct! The word is house")).toBeVisible();
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

  it("NH-9: guesses with the on-screen keyboard and marks used letters", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    const keys = screen.getByRole("list", { name: "Letters" });

    await user.click(within(keys).getByRole("button", { name: "o" }));
    await user.click(within(keys).getByRole("button", { name: "z" }));

    expect(screen.getByRole("img", { name: "Word: _o___" })).toBeVisible();
    expect(screen.getByText("Wrong guesses left: 5")).toBeVisible();
    expect(within(keys).getByRole("button", { name: /^o/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("NH-9: a repeated letter does not cost a guess", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("zzz");

    expect(screen.getByText("Wrong guesses left: 5")).toBeVisible();
  });

  it("NH-9: runs out of guesses, reveals the word and records it as wrong", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("qwxzjk");

    expect(
      screen.getByText("Out of guesses. The word was: house"),
    ).toBeVisible();
    expect(screen.getByText("Wrong guesses left: 0")).toBeVisible();
    await user.keyboard("{Enter}");

    // FR-TRN-7: the missed word comes back once; the repeat does not change progress again.
    expect(await screen.findByText("Wrong guesses left: 6")).toBeVisible();
    await user.keyboard("house");
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

  it("NH-9: guesses å, ä and ö typed on the keyboard", async () => {
    await seedWords([["smör", "smör"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("o");
    expect(screen.getByText("Wrong guesses left: 5")).toBeVisible();
    await user.keyboard("Ö");

    expect(screen.getByRole("img", { name: "Word: __ö_" })).toBeVisible();
  });

  it("NH-9: is available with a single word and has no axe violations", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    const { container } = render(<App />);

    await startSession(user);
    await user.keyboard("zh");

    expect(await axe(container)).toHaveNoViolations();
  });
});
