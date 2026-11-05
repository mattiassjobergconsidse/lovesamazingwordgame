import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { readBestScore, readLibrary, seedDatabase, setWithPairs } from "./seed";

const WORDS: [string, string][] = [
  ["hus", "house"],
  ["bil", "car"],
  ["hund", "dog"],
  ["katt", "cat"],
  ["bok", "book"],
];
const ANSWERS = new Map(WORDS);
/** Only the clock is faked: the HUD polls it on a real interval, so the round ends within a tick. */
const FAKED = ["Date"] as const;

beforeEach(() => {
  window.location.hash = "#/train/speed";
});

afterEach(async () => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedSpeed(bestScore?: number) {
  const { set, pairs } = setWithPairs("Week 1", WORDS);
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({ activeSetId: set.id, directionMode: "AtoB" }),
    bestScores:
      bestScore === undefined
        ? []
        : [{ setId: set.id, score: bestScore, achievedAt: 1 }],
  });
  return set;
}

async function startRound(
  user: ReturnType<typeof userEvent.setup>,
  options: { readonly practice?: boolean } = {},
) {
  if (options.practice === true) {
    await user.click(
      await screen.findByRole("checkbox", { name: /Practice without a timer/ }),
    );
  }
  await user.click(await screen.findByRole("button", { name: "Start" }));
}

function optionsList() {
  return within(
    screen.getByRole("list", { name: "Choose the answer (English)" }),
  );
}

/** Finds the prompt on screen and returns its correct and one wrong answer. */
function currentAnswers() {
  const prompt = [...ANSWERS.keys()].find((word) =>
    screen.queryByText(word, { selector: "p" }),
  );
  if (prompt === undefined) {
    throw new Error("no prompt on screen");
  }
  const correct = ANSWERS.get(prompt) ?? "";
  const wrong = optionsList()
    .getAllByRole("button")
    .map((button) => button.textContent)
    .find((text) => !text.includes(correct));
  return { correct, wrong: wrong?.replace(/^\d/u, "") ?? "" };
}

async function answerCurrent(
  user: ReturnType<typeof userEvent.setup>,
  outcome: "correct" | "wrong",
) {
  const { correct, wrong } = currentAnswers();
  await user.click(
    optionsList().getByRole("button", {
      name: outcome === "correct" ? correct : wrong,
    }),
  );
}

/** Moves the clock past the end of the round. */
function runOutTheClock() {
  vi.setSystemTime(Date.now() + 61_000);
}

describe("speed round", () => {
  it("NH-16: describes the round and offers a no-timer variant before starting", async () => {
    await seedSpeed();
    render(<App />);

    expect(
      await screen.findByText(/Answer as many questions as you can/),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: /Practice without a timer/ }),
    ).not.toBeChecked();
  });

  it("NH-16: shows a countdown, the score and the combo while running", async () => {
    await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);

    expect(screen.getByRole("timer", { name: "Time left" })).toHaveTextContent(
      /\d+ s left/,
    );
    expect(screen.getByText("Score: 0")).toBeVisible();
    expect(screen.getByText("Combo x1 (0 in a row)")).toBeVisible();
  });

  it("NH-16: a correct answer scores points and starts a combo", async () => {
    await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);

    await answerCurrent(user, "correct");

    expect(await screen.findByText("Score: 10")).toBeVisible();
    expect(screen.getByText("Combo x1 (1 in a row)")).toBeVisible();
  });

  it("NH-16: a wrong answer resets the combo", async () => {
    await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);
    await answerCurrent(user, "correct");
    await screen.findByText("1 / 5");

    await answerCurrent(user, "wrong");

    expect(await screen.findByText("Combo x1 (0 in a row)")).toBeVisible();
    expect(screen.getByText("Score: 10")).toBeVisible();
  });

  it("NH-16: raises the multiplier after three correct answers in a row", async () => {
    await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);

    for (const done of ["1", "2", "3"]) {
      await answerCurrent(user, "correct");
      await screen.findByText(`${done} / 5`);
    }

    expect(screen.getByText("Combo x2 (3 in a row)")).toBeVisible();
  });

  it("NH-16: answers with the number keys", async () => {
    await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);
    const { correct } = currentAnswers();
    const index = optionsList()
      .getAllByRole("button")
      .findIndex((button) => button.textContent.endsWith(correct));

    await user.keyboard(String(index + 1));

    expect(await screen.findByText("Score: 10")).toBeVisible();
  });

  it("FR-TRN-4: saves the first answer to a word right away", async () => {
    const set = await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);

    await answerCurrent(user, "correct");

    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress).toHaveLength(1);
      expect(progress[0]).toMatchObject({ setId: set.id, correct: 1, box: 1 });
    });
  });

  it("NH-16: ends when the time runs out and stores the score as the best", async () => {
    const set = await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);
    await answerCurrent(user, "correct");
    await screen.findByText("Score: 10");
    vi.useFakeTimers({ toFake: [...FAKED] });
    runOutTheClock();
    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    expect(screen.getByText("Score: 10")).toBeVisible();
    expect(await screen.findByText("New best score! 🏆")).toBeVisible();
    await waitFor(async () => {
      expect(await readBestScore(set.id)).toBe(10);
    });
  });
  it("NH-16: shows the old best score and keeps it when it is not beaten", async () => {
    const set = await seedSpeed(1000);
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);
    await answerCurrent(user, "correct");
    await screen.findByText("Score: 10");
    vi.useFakeTimers({ toFake: [...FAKED] });
    runOutTheClock();
    expect(await screen.findByText("Best score: 1000")).toBeVisible();
    expect(screen.queryByText(/New best score/)).toBeNull();
    expect(await readBestScore(set.id)).toBe(1000);
  });
  it("NH-16: a round without a score is not a best score", async () => {
    const set = await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);
    vi.useFakeTimers({ toFake: [...FAKED] });
    runOutTheClock();
    expect(await screen.findByText("Score: 0")).toBeVisible();
    expect(await screen.findByText(/No best score yet/)).toBeVisible();
    expect(screen.queryByText(/New best score/)).toBeNull();
    expect(await readBestScore(set.id)).toBeNull();
  });

  it("NH-16: the no-timer variant has no countdown, ends with the words and keeps no best score", async () => {
    const set = await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user, { practice: true });

    expect(screen.queryByRole("timer")).toBeNull();
    for (const done of ["1", "2", "3", "4"]) {
      await answerCurrent(user, "correct");
      await screen.findByText(`${done} / 5`);
    }
    await answerCurrent(user, "correct");

    expect(await screen.findByText("Score: 70")).toBeVisible();
    expect(
      screen.getByText("Practice rounds do not count towards the best score."),
    ).toBeVisible();
    expect(await readBestScore(set.id)).toBeNull();
  });

  it("NH-16: starts in the no-timer variant when the user prefers reduced motion", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    await seedSpeed();
    render(<App />);

    expect(
      await screen.findByRole("checkbox", { name: /Practice without a timer/ }),
    ).toBeChecked();
  });

  it("NH-16: Esc leaves the round without a prompt", async () => {
    await seedSpeed();
    const user = userEvent.setup();
    render(<App />);
    await startRound(user);

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(window.location.hash).toBe("#/train");
    });
  });

  it("NH-16: the Swedish interface is complete", async () => {
    const { set, pairs } = setWithPairs("Vecka 1", WORDS);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id, uiLanguage: "sv" }),
    });
    render(<App />);

    expect(await screen.findByText(/Svara på så många frågor/)).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: /Öva utan tidtagning/ }),
    ).toBeVisible();
  });

  it("FR-BP-11: has no axe violations while running and on the result screen", async () => {
    await seedSpeed();
    const user = userEvent.setup();
    const { container } = render(<App />);
    await startRound(user);
    await answerCurrent(user, "correct");
    await screen.findByText("Score: 10");

    // The countdown keeps ticking while axe runs, so the check happens inside act.
    const whileRunning = await act(async () => await axe(container));
    expect(whileRunning).toHaveNoViolations();

    vi.useFakeTimers({ toFake: [...FAKED] });
    runOutTheClock();
    await screen.findByRole("heading", { name: "Session complete" });
    await screen.findByText("New best score! 🏆");

    expect(await axe(container)).toHaveNoViolations();
  });
});
