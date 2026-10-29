import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { GAME_UNLOCK_KEY } from "../src/storage/gameUnlockStore";
import { deleteAppDatabase, makeSettings } from "./factories";
import { seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "#/games";
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

async function seedOneWord(uiLanguage: "en" | "sv" = "en") {
  const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({
      activeSetId: set.id,
      directionMode: "AtoB",
      uiLanguage,
    }),
  });
}

function grantPlay() {
  localStorage.setItem(GAME_UNLOCK_KEY, JSON.stringify({ earnedAt: 1 }));
}

function reduceMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

describe("games hub", () => {
  it("NH-11: shows all three games locked with the requirement", async () => {
    await seedOneWord();
    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Games" }),
    ).toBeVisible();
    expect(screen.getByText(/Locked\. Answer every word/)).toBeVisible();
    for (const id of ["memory", "catch", "simon"]) {
      expect(screen.getByTestId(`game-${id}`)).toHaveClass("game-card-locked");
    }
    expect(screen.queryByRole("link", { name: "Play" })).toBeNull();
  });

  it("NH-11: shows Play links for every game while a play is saved", async () => {
    grantPlay();
    await seedOneWord();
    render(<App />);

    expect(await screen.findByText(/one play ready/)).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Play" })).toHaveLength(3);
  });

  it("NH-11: is reachable from the main navigation and translated", async () => {
    window.location.hash = "#/";
    await seedOneWord("sv");
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("link", { name: "Spel" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Spel" }),
    ).toBeVisible();
    expect(screen.getByText(/^Låst\. Svara rätt/)).toBeVisible();
  });

  it("FR-BP-11: has no accessibility violations", async () => {
    grantPlay();
    await seedOneWord();
    const { container } = render(<App />);
    await screen.findByText(/one play ready/);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("earning a play", () => {
  const WORDS: [string, string][] = [
    ["hus", "house"],
    ["katt", "cat"],
    ["hund", "dog"],
    ["bil", "car"],
    ["bok", "book"],
  ];
  type User = ReturnType<typeof userEvent.setup>;

  async function startWriting(user: User, words = WORDS) {
    window.location.hash = "#/train/writing";
    await seedWords(words);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
  }

  const promptText = () =>
    document.querySelector(".session-card-term")?.textContent ?? "";
  const answerFor = (prompt: string) =>
    WORDS.find(([sv]) => sv === prompt)?.[1] ?? "";
  const answerBox = () =>
    screen.findByRole("textbox", { name: "Your answer (English)" });

  /** Types the right answer for every remaining card until the session ends. */
  async function solveRest(user: User) {
    while (
      screen.queryByRole("heading", { name: "Session complete" }) === null
    ) {
      const prompt = promptText();
      await user.type(await answerBox(), answerFor(prompt));
      await user.click(screen.getByRole("button", { name: "Check" }));
      await waitFor(() => {
        expect(
          promptText() !== prompt ||
            screen.queryByRole("heading", { name: "Session complete" }) !==
              null,
        ).toBe(true);
      });
    }
  }

  async function startWithMistake(user: User) {
    await startWriting(user);
    await user.type(await answerBox(), "zzzzz");
    await user.click(screen.getByRole("button", { name: "Check" }));
  }

  it("NH-11: a perfect Writing session offers the games and stores one play", async () => {
    const user = userEvent.setup();
    await startWriting(user);

    await solveRest(user);

    expect(
      await screen.findByRole("heading", { name: "You won a mini-game!" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Emoji memory/ })).toHaveAttribute(
      "href",
      "#/games/memory",
    );
    expect(screen.getByRole("link", { name: /Catch it!/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Pattern pads/ })).toBeVisible();
    expect(localStorage.getItem(GAME_UNLOCK_KEY)).not.toBeNull();
  });

  it("NH-11: a perfect session that is too short earns nothing", async () => {
    const user = userEvent.setup();
    await startWriting(user, WORDS.slice(0, 4));

    await solveRest(user);

    expect(screen.queryByText("You won a mini-game!")).toBeNull();
    expect(localStorage.getItem(GAME_UNLOCK_KEY)).toBeNull();
  });

  it("NH-11: a wrong first answer earns nothing, even if the repeat is right", async () => {
    const user = userEvent.setup();
    await startWithMistake(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await solveRest(user);

    expect(screen.queryByText("You won a mini-game!")).toBeNull();
    expect(localStorage.getItem(GAME_UNLOCK_KEY)).toBeNull();
  });

  it("NH-11: overriding a wrong verdict does not count as all correct", async () => {
    const user = userEvent.setup();
    await startWithMistake(user);
    await user.click(screen.getByRole("button", { name: "I was right" }));

    await solveRest(user);

    expect(screen.queryByText("You won a mini-game!")).toBeNull();
    expect(localStorage.getItem(GAME_UNLOCK_KEY)).toBeNull();
  });

  it("NH-11: a hint means the session is not perfect", async () => {
    const user = userEvent.setup();
    await startWriting(user);
    await user.click(screen.getByRole("button", { name: "Hint" }));
    await user.type(await answerBox(), answerFor(promptText()));
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(await screen.findByRole("button", { name: "Next" }));

    await solveRest(user);

    expect(screen.queryByText("You won a mini-game!")).toBeNull();
    expect(localStorage.getItem(GAME_UNLOCK_KEY)).toBeNull();
  });
});

describe("playing", () => {
  it("NH-11: a locked game cannot be started", async () => {
    window.location.hash = "#/games/memory";
    await seedOneWord();
    render(<App />);

    expect(
      await screen.findByText("This game is locked right now."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("NH-11: opening a game keeps the play; pressing Start uses it up", async () => {
    window.location.hash = "#/games/memory";
    grantPlay();
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);

    const start = await screen.findByRole("button", { name: "Start" });
    expect(localStorage.getItem(GAME_UNLOCK_KEY)).not.toBeNull();
    await user.click(start);

    expect(localStorage.getItem(GAME_UNLOCK_KEY)).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /^Card \d+, face down$/ }),
    ).toHaveLength(12);
  });

  it("NH-11: memory cards turn over and arrow keys move between them", async () => {
    window.location.hash = "#/games/memory";
    grantPlay();
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    const first = screen.getByRole("button", { name: "Card 1, face down" });
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("button", { name: "Card 2, face down" }),
    ).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("button", { name: "Card 6, face down" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByText("Moves: 0")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Card 6, face down" }),
    ).toBeNull();
  });

  it("NH-11: with reduced motion a mismatch stays until another card is picked", async () => {
    reduceMotion();
    window.location.hash = "#/games/memory";
    grantPlay();
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    for (
      let n = 1;
      n <= 11 && screen.queryByText(/turn these back/) === null;
      n += 2
    ) {
      await user.click(
        screen.getByRole("button", { name: `Card ${String(n)}, face down` }),
      );
      await user.click(
        screen.getByRole("button", {
          name: `Card ${String(n + 1)}, face down`,
        }),
      );
    }

    expect(
      await screen.findByText("Pick another card to turn these back."),
    ).toBeVisible();
  });

  it("NH-11: Simon ends on the first mistake and the games lock again", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    window.location.hash = "#/games/simon";
    grantPlay();
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    expect(screen.getByText("Watch the pattern…")).toBeVisible();
    await screen.findByText(/^Your turn!/);
    await user.keyboard("3");

    expect(
      await screen.findByText("Game over! You repeated 0 patterns."),
    ).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Back to games" }));
    expect(await screen.findByText(/Locked\. Answer every word/)).toBeVisible();
  });

  it("NH-11: Simon accepts the pad buttons for a correct round", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    window.location.hash = "#/games/simon";
    grantPlay();
    await seedOneWord();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await screen.findByText(/^Your turn!/);

    await user.click(screen.getByRole("button", { name: /^Blue/ }));

    expect(await screen.findByText("Round 2")).toBeVisible();
  });

  it("NH-11: the catch game scores points and ends when time is up", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    window.location.hash = "#/games/catch";
    grantPlay();
    await seedOneWord();
    render(<App />);
    const start = await screen.findByRole("button", { name: "Start" });
    // Only timers are faked, so Testing Library's async helpers keep working.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    fireEvent.click(start);
    expect(screen.getByText(/Score: 0/)).toBeVisible();
    fireEvent.keyDown(screen.getByRole("application"), { key: "ArrowRight" });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(
      screen.getByText(/^Round over! You caught \d+ apples\.$/),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to games" })).toBeVisible();
  });
});
