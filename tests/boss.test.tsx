import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import type { AnswerResult } from "../src/types";
import { deleteAppDatabase, makeProgress, makeSettings } from "./factories";
import { readLibrary, readTrophies, seedDatabase, setWithPairs } from "./seed";

const WORDS: [string, string][] = [
  ["hus", "house"],
  ["bil", "car"],
  ["hund", "dog"],
  ["katt", "cat"],
  ["bok", "book"],
];
const ANSWERS = new Map(WORDS);

beforeEach(() => {
  window.location.hash = "#/train/boss";
});

afterEach(async () => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

/** How the words of a seeded set were answered before the test starts. */
interface History {
  /** Words with a lifetime wrong count, which makes them "hardest". */
  readonly hard?: readonly number[];
  /** Words whose latest answer, just now, was wrong. */
  readonly mistakes?: readonly number[];
}

async function seedBoss(
  history: History,
  settings: Parameters<typeof makeSettings>[0] = {},
) {
  const { set, pairs } = setWithPairs("Week 1", WORDS);
  const now = Date.now();
  const progress = [
    ...(history.hard ?? []).map((index) =>
      makeProgress({
        pairId: pairs[index]?.id ?? "",
        setId: set.id,
        correct: 1,
        wrong: 2,
        // Hard by their counts, but answered correctly last time, so they
        // are not mistakes of the last session.
        lastSeenAt: 1000,
        lastResult: "correct" as AnswerResult,
      }),
    ),
    ...(history.mistakes ?? []).map((index, position) =>
      makeProgress({
        pairId: pairs[index]?.id ?? "",
        setId: set.id,
        correct: 1,
        wrong: 2,
        lastSeenAt: now - position * 1000,
        lastResult: "wrong" as AnswerResult,
      }),
    ),
  ];
  await seedDatabase({
    sets: [set],
    pairs,
    progress,
    settings: makeSettings({
      activeSetId: set.id,
      directionMode: "AtoB",
      ...settings,
    }),
  });
  return { set, pairs };
}

const HARD_THREE = { hard: [0, 1, 2] };

async function startBattle(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Start" }));
}

function optionsList() {
  return within(
    screen.getByRole("list", { name: "Choose the answer (English)" }),
  );
}

/** The prompt on screen and its correct answer. */
function currentWord() {
  const prompt = [...ANSWERS.keys()].find((word) =>
    screen.queryByText(word, { selector: "p" }),
  );
  if (prompt === undefined) {
    throw new Error("no prompt on screen");
  }
  return { prompt, correct: ANSWERS.get(prompt) ?? "" };
}

async function answerQuiz(
  user: ReturnType<typeof userEvent.setup>,
  right: boolean,
) {
  const { correct } = currentWord();
  const buttons = optionsList().getAllByRole("button");
  const choice = buttons.find(
    (button) => (button.textContent.replace(/^\d/u, "") === correct) === right,
  );
  if (choice === undefined) {
    throw new Error("no matching option");
  }
  await user.click(choice);
  await user.click(await screen.findByRole("button", { name: "Next" }));
}

function healthText() {
  return screen.getByText(/health left$/u, { selector: "p" }).textContent;
}

describe("boss battle", () => {
  it("NH-15: the mode card is disabled with a message until a pool has 3 words", async () => {
    window.location.hash = "#/train";
    await seedBoss({ hard: [0, 1] });
    render(<App />);

    const card = await screen.findByRole("button", { name: /Boss Battle/ });

    expect(card).toBeDisabled();
    expect(
      screen.getByText(/Boss Battle needs at least 3 hard words or mistakes/),
    ).toBeVisible();
  });

  it("NH-15: the mode card links to the battle once the hardest words are enough", async () => {
    window.location.hash = "#/train";
    await seedBoss(HARD_THREE);
    render(<App />);

    expect(
      await screen.findByRole("link", { name: /Boss Battle/ }),
    ).toHaveAttribute("href", "#/train/boss");
  });

  it("NH-15: opening the battle without enough words explains why it cannot start", async () => {
    await seedBoss({ hard: [0, 1] });
    render(<App />);

    expect(
      await screen.findByText(/Boss Battle needs at least 3 hard words/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to the training modes" }),
    ).toHaveAttribute("href", "#/train");
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("NH-15: a set with fewer than 3 words is blocked by the word count", async () => {
    const { set, pairs } = setWithPairs("Week 1", WORDS.slice(0, 2));
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(await screen.findByText("Needs at least 3 words.")).toBeVisible();
  });

  it("NH-15: the start panel shows the boss pool and its size", async () => {
    await seedBoss(HARD_THREE);
    render(<App />);

    expect(await screen.findByText("3 words in this session")).toBeVisible();
    expect(screen.getByText("Made from your hardest words")).toBeVisible();
  });

  it("NH-15: the boss is another mascot than the user's, at full health", async () => {
    await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    render(<App />);
    await startBattle(user);

    const hud = screen.getByRole("region", { name: /^Boss / });

    expect(
      within(hud).getByTestId("mascot").getAttribute("data-mascot"),
    ).not.toBe("volt");
    expect(
      within(hud).getByRole("meter", { name: "Boss health" }),
    ).toHaveAttribute("aria-valuetext", "30 of 30 health left");
    expect(healthText()).toBe("30 of 30 health left");
  });

  it("NH-15: right answers damage the boss until it is defeated, and progress is saved", async () => {
    await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    render(<App />);
    await startBattle(user);

    await answerQuiz(user, true);
    expect(healthText()).toBe("20 of 30 health left");
    expect(screen.getByText("Direct hit!")).toBeVisible();
    await answerQuiz(user, true);
    expect(healthText()).toBe("10 of 30 health left");
    await answerQuiz(user, true);

    expect(
      await screen.findByRole("heading", { name: "Boss defeated!" }),
    ).toBeVisible();
    expect(screen.getByText("3 of 3 correct")).toBeVisible();
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(
        progress.filter((record) => record.lastResult === "correct"),
      ).toHaveLength(3);
    });
  });

  it("NH-15: a wrong answer heals the boss and brings the word back as a Writing question", async () => {
    await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    render(<App />);
    await startBattle(user);

    await answerQuiz(user, true);
    expect(healthText()).toBe("20 of 30 health left");
    const missed = currentWord();
    await answerQuiz(user, false);

    expect(healthText()).toBe("23 of 30 health left");
    expect(screen.getByText("The boss healed a little.")).toBeVisible();
    await answerQuiz(user, true);
    expect(healthText()).toBe("12 of 30 health left");

    // The missed word returns, now to be typed.
    expect(screen.getByText("Repeat")).toBeVisible();
    expect(screen.getByText(missed.prompt, { selector: "p" })).toBeVisible();
    expect(screen.getByText(/You missed this one/)).toBeVisible();
    const input = screen.getByRole("textbox", {
      name: "Your answer (English)",
    });
    await user.type(input, `${missed.correct}{Enter}`);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Boss defeated!" },
        { timeout: 4000 },
      ),
    ).toBeVisible();
    expect(screen.getByText("2 of 3 correct")).toBeVisible();
  });

  it("FR-TRN-4: only the first answer of a word changes its progress, even when it comes back", async () => {
    const { pairs } = await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    render(<App />);
    await startBattle(user);
    const missed = currentWord();

    await answerQuiz(user, false);
    await answerQuiz(user, true);
    await answerQuiz(user, true);
    const input = screen.getByRole("textbox", {
      name: "Your answer (English)",
    });
    await user.type(input, `${missed.correct}{Enter}`);
    await screen.findByRole(
      "heading",
      { name: "Boss defeated!" },
      { timeout: 4000 },
    );

    await waitFor(async () => {
      const { progress } = await readLibrary();
      const record = progress.find(
        (item) =>
          item.pairId === pairs.find((pair) => pair.a === missed.prompt)?.id,
      );
      expect(record).toMatchObject({
        wrong: 3,
        correct: 1,
        lastResult: "wrong",
      });
    });
  });

  it("NH-10: defeating a boss unlocks the Boss slayer trophy", async () => {
    await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    render(<App />);
    await startBattle(user);

    await answerQuiz(user, true);
    await answerQuiz(user, true);
    await answerQuiz(user, true);

    await waitFor(async () => {
      expect((await readTrophies()).map((record) => record.id)).toContain(
        "modeBoss",
      );
    });
  });

  it("NH-15: can be played with the keyboard only", async () => {
    await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    render(<App />);

    (await screen.findByRole("button", { name: "Start" })).focus();
    await user.keyboard("{Enter}");
    for (let round = 0; round < 3; round += 1) {
      await screen.findByRole("list", { name: "Choose the answer (English)" });
      const { correct } = currentWord();
      const index = optionsList()
        .getAllByRole("button")
        .findIndex(
          (button) => button.textContent.replace(/^\d/u, "") === correct,
        );
      await user.keyboard(String(index + 1));
      await user.keyboard("{Enter}");
    }

    expect(
      await screen.findByRole("heading", { name: "Boss defeated!" }),
    ).toBeVisible();
  });

  it("NH-15: has no accessibility violations while fighting", async () => {
    await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await startBattle(user);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("NH-15: has no accessibility violations on the end screen", async () => {
    await seedBoss(HARD_THREE);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await startBattle(user);
    await answerQuiz(user, true);
    await answerQuiz(user, true);
    await answerQuiz(user, true);
    await screen.findByRole("heading", { name: "Boss defeated!" });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("NH-15: is translated to Swedish", async () => {
    window.location.hash = "#/train";
    await seedBoss(HARD_THREE, { uiLanguage: "sv" });
    render(<App />);

    expect(
      await screen.findByRole("link", { name: /Bosskamp/ }),
    ).toHaveAttribute("href", "#/train/boss");
  });
});

describe("boss pool: last session mistakes", () => {
  it("NH-15: without a request the last session's mistakes make the boss, and the hardest words are offered instead", async () => {
    await seedBoss({ hard: [0, 1, 2], mistakes: [3, 4, 0] });
    render(<App />);

    expect(
      await screen.findByText("Made from your last session's mistakes"),
    ).toBeVisible();
    expect(screen.getByText("3 words in this session")).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Fight a boss made of your hardest words instead",
      }),
    ).toHaveAttribute("href", "#/train/boss/hardest");
  });

  it("NH-15: the hardest words can be asked for explicitly", async () => {
    window.location.hash = "#/train/boss/hardest";
    await seedBoss({ hard: [0, 1, 2, 3], mistakes: [3, 4, 0] });
    render(<App />);

    expect(
      await screen.findByText("Made from your hardest words"),
    ).toBeVisible();
    expect(screen.getByText("5 words in this session")).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Fight a boss made of your last session's mistakes instead",
      }),
    ).toBeVisible();
  });

  it("NH-15: asking for a pool that is too small is blocked", async () => {
    window.location.hash = "#/train/boss/mistakes";
    await seedBoss({ hard: [0, 1, 2], mistakes: [3, 4] });
    render(<App />);

    expect(
      await screen.findByText(/Boss Battle needs at least 3 hard words/),
    ).toBeVisible();
  });

  it("NH-15: earlier sessions do not count as the last session", async () => {
    window.location.hash = "#/train";
    // Only two mistakes are recent; the third is hours older, so the pool is too small.
    const { set, pairs } = setWithPairs("Week 1", WORDS);
    const now = Date.now();
    await seedDatabase({
      sets: [set],
      pairs,
      progress: [0, 1, 2].map((index) =>
        makeProgress({
          pairId: pairs[index]?.id ?? "",
          setId: set.id,
          wrong: 1,
          lastSeenAt: now - index * 3 * 60 * 60 * 1000,
          lastResult: "wrong",
        }),
      ),
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(
      await screen.findByRole("button", { name: /Boss Battle/ }),
    ).toBeDisabled();
  });
});

describe("last session mistakes on the home screen and in other modes", () => {
  it("NH-15: the home screen offers to practise the last session's mistakes", async () => {
    window.location.hash = "#/";
    await seedBoss({ mistakes: [0, 1] });
    render(<App />);

    expect(
      await screen.findByRole("link", {
        name: "Practise last session's mistakes",
      }),
    ).toHaveAttribute("href", "#/train/flashcards/mistakes");
  });

  it("NH-15: the home screen disables the mistakes button when the last session was clean", async () => {
    window.location.hash = "#/";
    await seedBoss({});
    render(<App />);

    await screen.findByRole("heading", { name: "Choose how to practise" });
    expect(
      screen.queryByRole("link", { name: "Practise last session's mistakes" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Practise last session's mistakes" }),
    ).toBeDisabled();
  });

  it("NH-15: a mistakes session contains only the mistakes of the last session", async () => {
    window.location.hash = "#/train/flashcards/mistakes";
    await seedBoss({ mistakes: [0, 1] });
    render(<App />);

    expect(await screen.findByText("2 words in this session")).toBeVisible();
  });

  it("NH-15: a mistakes session without mistakes says so", async () => {
    window.location.hash = "#/train/flashcards/mistakes";
    await seedBoss({});
    render(<App />);

    expect(
      await screen.findByText(
        "There are no mistakes from your last session to practise.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });
});
