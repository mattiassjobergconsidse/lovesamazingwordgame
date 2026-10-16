import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

const WORDS: [string, string][] = [
  ["hus", "house"],
  ["bil", "car"],
  ["hund", "dog"],
  ["katt", "cat"],
  ["bok", "book"],
  ["sol", "sun"],
  ["måne", "moon"],
  ["stjärna", "star"],
];

const PARTNER = new Map<string, string>([
  ...WORDS,
  ...WORDS.map(([a, b]): [string, string] => [b, a]),
]);

type Language = "Svenska" | "English";

beforeEach(() => {
  window.location.hash = "#/train/matching";
});

afterEach(async () => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedMatching(wordCount: number) {
  const { set, pairs } = setWithPairs("Week 1", WORDS.slice(0, wordCount));
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({ activeSetId: set.id }),
  });
}

async function startMatching(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Start" }));
}

function column(language: Language) {
  return within(screen.getByRole("list", { name: language }));
}

/** The words of one column, without the shortcut label and the match marker. */
function words(language: Language): string[] {
  return column(language)
    .getAllByRole("button")
    .map((button) => button.textContent)
    .map((text) => text.replace(/^[1-9A-Z]/u, "").replace(/ [✓✗]$/u, ""));
}

function itemNamed(text: string) {
  return screen.getByRole("button", { name: text });
}

function partnerOf(text: string): string {
  return PARTNER.get(text) ?? "";
}

function shortcutOf(text: string): string {
  return itemNamed(text).getAttribute("aria-keyshortcuts") ?? "";
}

/** Taps every pair of the visible round; uses fireEvent so it also works under fake timers. */
function matchAllVisible() {
  for (const word of words("Svenska")) {
    fireEvent.click(itemNamed(word));
    fireEvent.click(itemNamed(partnerOf(word)));
  }
}

/** Testing Library's async helpers wait on real timers, so taps use fireEvent under fake ones. */
function useFakeClock() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

describe("matching mode", () => {
  it("FR-MT-1: shows up to six words per column, labelled with each language", async () => {
    await seedMatching(8);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);

    expect(column("Svenska").getAllByRole("button")).toHaveLength(6);
    expect(column("English").getAllByRole("button")).toHaveLength(6);
    expect(screen.getByText("0 / 8")).toBeVisible();
  });

  it("FR-MT-2: locks a correct pair in green", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    const word = words("Svenska")[0] ?? "";

    await user.click(itemNamed(word));
    expect(itemNamed(word)).toHaveAttribute("aria-pressed", "true");
    await user.click(itemNamed(partnerOf(word)));

    expect(screen.getByText("Match!")).toBeVisible();
    expect(itemNamed(word)).toHaveAttribute("data-state", "matched");
    expect(itemNamed(partnerOf(word))).toHaveAttribute("data-state", "matched");
  });

  it("FR-MT-2: marks a wrong pair and deselects it", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    const [word = "", other = ""] = words("Svenska");

    await user.click(itemNamed(word));
    await user.click(itemNamed(partnerOf(other)));

    expect(screen.getByText("Not a match, try again")).toBeVisible();
    expect(itemNamed(word)).toHaveAttribute("data-state", "wrong");
    expect(itemNamed(partnerOf(other))).toHaveAttribute("data-state", "wrong");
    expect(itemNamed(word)).toHaveAttribute("aria-pressed", "false");
  });

  it("FR-MT-2: clears the wrong marking after a moment", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    const [word = "", other = ""] = words("Svenska");
    useFakeClock();

    fireEvent.click(itemNamed(word));
    fireEvent.click(itemNamed(partnerOf(other)));
    expect(itemNamed(word)).toHaveAttribute("data-state", "wrong");
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(itemNamed(word)).toHaveAttribute("data-state", "idle");
  });

  it("FR-MT-2: tapping a selected word again deselects it", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    const word = words("Svenska")[0] ?? "";

    await user.click(itemNamed(word));
    await user.click(itemNamed(word));

    expect(itemNamed(word)).toHaveAttribute("aria-pressed", "false");
  });

  it("FR-MT-2: pairs with the number and the letter shown on the items", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    const word = words("Svenska")[0] ?? "";

    await user.keyboard(shortcutOf(word));
    await user.keyboard(shortcutOf(partnerOf(word)));

    expect(screen.getByText("Match!")).toBeVisible();
    expect(itemNamed(word)).toHaveAttribute("data-state", "matched");
  });

  it("FR-MT-2: moves focus with the arrow keys", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    const [first, second] = column("Svenska").getAllByRole("button");
    first?.focus();

    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(column("English").getAllByRole("button")[0]).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(first).toHaveFocus();
  });

  it("FR-MT-3: moves on to the next round after the last match of a round", async () => {
    await seedMatching(8);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    useFakeClock();

    matchAllVisible();
    expect(screen.getByText("0 / 8")).toBeVisible();
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText("6 / 8")).toBeVisible();
    expect(column("Svenska").getAllByRole("button")).toHaveLength(2);
  });

  it("FR-MT-3, FR-TRN-4: ends the session when all rounds are matched and saves first-attempt results", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);
    const [first = "", second = ""] = words("Svenska");
    useFakeClock();

    fireEvent.click(itemNamed(first));
    fireEvent.click(itemNamed(partnerOf(second)));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    matchAllVisible();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    expect(screen.getByText("1 of 3 correct")).toBeVisible();
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress).toHaveLength(3);
      expect(progress.filter((record) => record.wrong === 1)).toHaveLength(2);
      expect(progress.filter((record) => record.correct === 1)).toHaveLength(1);
    });
  });

  it("FR-MT-4: keeps a single leftover word in the previous round", async () => {
    await seedMatching(7);
    const user = userEvent.setup();
    render(<App />);
    await startMatching(user);

    expect(column("Svenska").getAllByRole("button")).toHaveLength(7);
  });

  it("FR-BP-11: has no axe violations while matching", async () => {
    await seedMatching(3);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await startMatching(user);
    await user.click(itemNamed(words("Svenska")[0] ?? ""));

    expect(await axe(container)).toHaveNoViolations();
  });
});
