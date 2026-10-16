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
];

const ANSWERS = new Map(WORDS);

beforeEach(() => {
  window.location.hash = "#/train/quiz";
});

afterEach(async () => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedQuiz(wordCount: number) {
  const { set, pairs } = setWithPairs("Week 1", WORDS.slice(0, wordCount));
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({ activeSetId: set.id, directionMode: "AtoB" }),
  });
}

async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
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

describe("quiz mode", () => {
  it("FR-QZ-1: shows four options that include the correct answer, without duplicates", async () => {
    await seedQuiz(5);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);

    const buttons = optionsList().getAllByRole("button");
    const labels = buttons.map((button) =>
      button.textContent.replace(/^\d/u, ""),
    );

    expect(buttons).toHaveLength(4);
    expect(new Set(labels).size).toBe(4);
    expect(labels).toContain(currentAnswers().correct);
  });

  it.each([
    [3, 3],
    [2, 2],
  ])("FR-QZ-3: a set of %i words shows %i options", async (words, options) => {
    await seedQuiz(words);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);

    expect(optionsList().getAllByRole("button")).toHaveLength(options);
  });

  it("FR-QZ-2: marks a correct choice and records it", async () => {
    await seedQuiz(5);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);

    await user.click(
      optionsList().getByRole("button", {
        name: currentAnswers().correct,
      }),
    );

    expect(screen.getByText("Correct!")).toBeVisible();
    await user.keyboard("{Enter}");
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ correct: 1, box: 1 });
    });
  });

  it("FR-QZ-2: marks a wrong choice, reveals the correct answer and records it", async () => {
    await seedQuiz(5);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);
    const { correct, wrong } = currentAnswers();

    await user.click(optionsList().getByRole("button", { name: wrong }));

    expect(
      screen.getByText(`Not quite. Correct answer: ${correct}`),
    ).toBeVisible();
    expect(
      optionsList()
        .getByRole("button", { name: correct })
        .getAttribute("data-state"),
    ).toBe("correct");
    expect(
      optionsList()
        .getByRole("button", { name: wrong })
        .getAttribute("data-state"),
    ).toBe("wrong");
    await user.keyboard("{Enter}");
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ wrong: 1, box: 1 });
    });
  });

  it("FR-QZ-2: chooses with the number keys", async () => {
    await seedQuiz(5);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);
    const { correct } = currentAnswers();
    const index = optionsList()
      .getAllByRole("button")
      .findIndex((button) => button.textContent.endsWith(correct));

    await user.keyboard(String(index + 1));

    expect(screen.getByText("Correct!")).toBeVisible();
  });

  it("FR-QZ-2: ignores a number key without a matching option", async () => {
    await seedQuiz(2);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);

    await user.keyboard("4");

    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("FR-QZ-2: continues after about a second", async () => {
    await seedQuiz(3);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    // Testing Library's async helpers wait on real timers, so the choice uses fireEvent.
    fireEvent.click(
      optionsList().getByRole("button", { name: currentAnswers().correct }),
    );
    expect(screen.getByText("0 / 3")).toBeVisible();
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("1 / 3")).toBeVisible();
  });

  it("FR-QZ-2: continues on any key press, only once", async () => {
    await seedQuiz(3);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);
    await user.click(
      optionsList().getByRole("button", { name: currentAnswers().correct }),
    );

    await user.keyboard("x");

    expect(screen.getByText("1 / 3")).toBeVisible();
  });

  it("FR-QZ-2: Enter on the focused Next button continues exactly once", async () => {
    await seedQuiz(3);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);
    await user.click(
      optionsList().getByRole("button", { name: currentAnswers().correct }),
    );

    await user.keyboard("{Enter}");

    expect(screen.getByText("1 / 3")).toBeVisible();
  });

  it("FR-QZ-2: continues when the card is tapped", async () => {
    await seedQuiz(3);
    const user = userEvent.setup();
    render(<App />);
    await startQuiz(user);
    await user.click(
      optionsList().getByRole("button", { name: currentAnswers().correct }),
    );

    await user.click(screen.getByText("Correct!"));

    expect(screen.getByText("1 / 3")).toBeVisible();
  });

  it("FR-BP-11: has no axe violations after answering", async () => {
    await seedQuiz(5);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await startQuiz(user);
    await user.click(
      optionsList().getByRole("button", { name: currentAnswers().correct }),
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
