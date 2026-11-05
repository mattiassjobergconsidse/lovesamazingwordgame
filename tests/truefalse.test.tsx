import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { readLibrary, readTrophies, seedDatabase, setWithPairs } from "./seed";

const WORDS: [string, string][] = [
  ["hus", "house"],
  ["bil", "car"],
  ["hund", "dog"],
  ["katt", "cat"],
  ["bok", "book"],
];
const ANSWERS = new Map(WORDS);
/** The feedback line; the toast region is also a status, so it is found by its text. */
const FEEDBACK = /^(Correct|Not quite)/;

beforeEach(() => {
  window.location.hash = "#/train/truefalse";
});

afterEach(async () => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedTrueFalse(uiLanguage: "sv" | "en" = "en") {
  const { set, pairs } = setWithPairs("Week 1", WORDS);
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({
      activeSetId: set.id,
      directionMode: "AtoB",
      uiLanguage,
    }),
  });
  return set;
}

async function startSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Start" }));
}

/** Reads the statement on screen: the prompt, the proposed translation and whether it is true. */
function currentStatement() {
  const prompt = [...ANSWERS.keys()].find((word) =>
    screen.queryByText(word, { selector: "p" }),
  );
  const proposed = [...ANSWERS.values()].find((word) =>
    screen.queryByText(word, { selector: "p" }),
  );
  if (prompt === undefined || proposed === undefined) {
    throw new Error("no statement on screen");
  }
  return { prompt, proposed, isTrue: ANSWERS.get(prompt) === proposed };
}

/** Clicks the button that is the right or the wrong judgement of the current statement. */
async function judge(
  user: ReturnType<typeof userEvent.setup>,
  outcome: "right" | "wrong",
) {
  const { isTrue } = currentStatement();
  const sayTrue = outcome === "right" ? isTrue : !isTrue;
  await user.click(
    screen.getByRole("button", { name: sayTrue ? /True/ : /False/ }),
  );
}

async function next(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Next" }));
}

describe("true or false mode", () => {
  it("NH-17: shows the prompt, a proposed translation and True and False buttons", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    const { prompt, proposed } = currentStatement();

    expect(prompt).toBeTruthy();
    expect(proposed).toBeTruthy();
    expect(screen.getByRole("button", { name: /True/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /False/ })).toBeVisible();
    expect(screen.getByText("0 / 5")).toBeVisible();
  });

  it("NH-17: a right judgement is confirmed and moves on after Next", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await judge(user, "right");

    expect(await screen.findByText(FEEDBACK)).toHaveTextContent(/^Correct!/);
    await next(user);
    expect(await screen.findByText("1 / 5")).toBeVisible();
  });

  it("NH-17: a wrong judgement tells the right answer", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    const { prompt, isTrue } = currentStatement();

    await judge(user, "wrong");

    const status = await screen.findByText(FEEDBACK);
    expect(status).toHaveTextContent(/^Not quite/);
    if (!isTrue) {
      expect(status).toHaveTextContent(ANSWERS.get(prompt) ?? "");
    }
  });

  it("NH-17: continues by itself after a moment", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await judge(user, "right");

    expect(
      await screen.findByText("1 / 5", {}, { timeout: 3_000 }),
    ).toBeVisible();
  });

  it("NH-17: answers with the keys Right, Left, T and F", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    for (const [index, [rightKey, wrongKey]] of [
      ["{ArrowRight}", "{ArrowLeft}"],
      ["t", "f"],
    ].entries()) {
      const { isTrue } = currentStatement();
      await user.keyboard((isTrue ? rightKey : wrongKey) ?? "");
      expect(await screen.findByText(FEEDBACK)).toHaveTextContent(/^Correct!/);
      await next(user);
      await screen.findByText(`${String(index + 1)} / 5`);
    }
  });

  it("NH-17: answers with a swipe right for true and left for false", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    const { isTrue } = currentStatement();
    const card = screen
      .getByRole("button", { name: /True/ })
      .closest(".session-card");
    if (card === null) throw new Error("no card");

    fireEvent.pointerDown(card, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(card, { clientX: isTrue ? 220 : -20, clientY: 100 });

    expect(await screen.findByText(FEEDBACK)).toHaveTextContent(/^Correct!/);
  });

  it("NH-17: a short swipe does not answer", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    const card = screen
      .getByRole("button", { name: /True/ })
      .closest(".session-card");
    if (card === null) throw new Error("no card");

    fireEvent.pointerDown(card, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(card, { clientX: 120, clientY: 100 });

    expect(screen.queryByText(FEEDBACK)).toBeNull();
  });

  it("FR-TRN-4: saves the first answer to a word right away", async () => {
    const set = await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await judge(user, "right");

    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress).toHaveLength(1);
      expect(progress[0]).toMatchObject({ setId: set.id, correct: 1, box: 1 });
    });
  });

  it("FR-TRN-4: a wrong judgement is saved as wrong", async () => {
    const set = await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await judge(user, "wrong");

    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ setId: set.id, wrong: 1 });
    });
  });

  it("NH-17: completing a session unlocks the True or False trophy", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    for (const answered of WORDS.keys()) {
      expect(await screen.findByText(`${String(answered)} / 5`)).toBeVisible();
      await judge(user, "right");
      await next(user);
    }

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    await waitFor(async () => {
      expect((await readTrophies()).map((trophy) => trophy.id)).toContain(
        "modeTrueFalse",
      );
    });
  });

  it("NH-17: Esc leaves the session without a prompt", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(window.location.hash).toBe("#/train");
    });
  });

  it("FR-ACT-1: needs at least two words", async () => {
    const { set, pairs } = setWithPairs("Tiny", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(await screen.findByText("Needs at least 2 words.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("NH-17: the Swedish interface is complete", async () => {
    await seedTrueFalse("sv");
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Starta" }));

    expect(screen.getByRole("button", { name: /Sant/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Falskt/ })).toBeVisible();
  });

  it("FR-BP-11: has no axe violations before and after judging", async () => {
    await seedTrueFalse();
    const user = userEvent.setup();
    const { container } = render(<App />);
    await startSession(user);

    expect(await axe(container)).toHaveNoViolations();

    await judge(user, "right");
    await screen.findByText(FEEDBACK);

    expect(await axe(container)).toHaveNoViolations();
  });
});
