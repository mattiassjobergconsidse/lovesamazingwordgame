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
import { deleteAppDatabase, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "#/train/writing";
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedWords(
  words: [string, string][],
  settings: Parameters<typeof makeSettings>[0] = {},
  alternatives: string[] = [],
) {
  const { set, pairs } = setWithPairs("Week 1", words);
  await seedDatabase({
    sets: [set],
    pairs: pairs.map((pair) =>
      alternatives.length > 0 ? { ...pair, altB: alternatives } : pair,
    ),
    settings: makeSettings({
      activeSetId: set.id,
      directionMode: "AtoB",
      ...settings,
    }),
  });
}

async function startSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Start" }));
  return screen.getByRole("textbox", { name: "Your answer (English)" });
}

describe("writing mode", () => {
  it("FR-WR-1: focuses a labelled input without autocorrect or spellcheck", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);

    const input = await startSession(user);

    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("autocapitalize", "none");
    expect(input).toHaveAttribute("autocorrect", "off");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(screen.getByText("Prompt (Svenska)")).toBeVisible();
  });

  it("FR-WR-2, FR-WR-3: accepts a case-insensitive answer and advances automatically", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup({ delay: null });
    render(<App />);
    const input = await startSession(user);
    await user.type(input, "  HOUSE ");
    // Testing Library's async helpers wait on real timers, so only the click is done under fake ones.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText("Correct!")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    vi.useRealTimers();

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    const { progress } = await readLibrary();
    expect(progress[0]).toMatchObject({ correct: 1, box: 1 });
  });

  it("FR-WR-3: Enter on the focused Next button skips the wait after a correct answer", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    const input = await startSession(user);

    await user.type(input, "house{Enter}");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
  });

  it("FR-WR-2, FR-SET-7: accepts an alternative answer", async () => {
    await seedWords([["stor", "big"]], {}, ["large"]);
    const user = userEvent.setup();
    render(<App />);
    const input = await startSession(user);

    await user.type(input, "large{Enter}");

    expect(screen.getByText("Correct!")).toBeVisible();
  });

  it("FR-WR-3: shows the correct answer with the differing letters marked on a wrong answer", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    const input = await startSession(user);

    await user.type(input, "hose{Enter}");

    expect(screen.getByText("Not quite")).toBeVisible();
    expect(screen.getByText("You wrote: hose")).toBeVisible();
    expect(screen.getByText("Correct answer:")).toBeVisible();
    const marked = screen
      .getAllByText("u")
      .find((element) => element.classList.contains("writing-diff"));
    expect(marked).toBeDefined();
  });

  it("FR-WR-3: continues after a wrong answer with Enter and repeats the word", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    const input = await startSession(user);

    await user.type(input, "car{Enter}");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Repeat")).toBeVisible();
    expect(screen.getByText("1 / 1")).toBeVisible();
    const { progress } = await readLibrary();
    expect(progress[0]).toMatchObject({ wrong: 1, box: 1 });
  });

  it("FR-WR-3: counts a wrong answer as correct with I was right", async () => {
    await seedWords([["fin", "nice"]]);
    const user = userEvent.setup();
    render(<App />);
    const input = await startSession(user);

    await user.type(input, "pretty{Enter}");
    await user.click(screen.getByRole("button", { name: "I was right" }));

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ correct: 1, wrong: 0 });
    });
  });

  it("FR-WR-3: treats an empty submission as wrong", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText("Not quite")).toBeVisible();
  });

  it("FR-WR-2: an accent-only difference is almost, not correct", async () => {
    await seedWords([["kött", "meat"]], { directionMode: "BtoA" });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.type(
      screen.getByRole("textbox", { name: "Your answer (Svenska)" }),
      "kott{Enter}",
    );

    expect(screen.getByText("Almost, check the accents")).toBeVisible();
    expect(screen.queryByRole("button", { name: "I was right" })).toBeNull();
    await user.keyboard("{Enter}");
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ box: 1, correct: 0, wrong: 0 });
    });
  });

  it("FR-WR-2: ignores accent differences when the setting is on", async () => {
    await seedWords([["kött", "meat"]], {
      directionMode: "BtoA",
      ignoreAccents: true,
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.type(
      screen.getByRole("textbox", { name: "Your answer (Svenska)" }),
      "kott{Enter}",
    );

    expect(screen.getByText("Correct!")).toBeVisible();
  });

  it("FR-WR-4: a hint reveals the next letter and makes a correct answer assisted", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    render(<App />);
    const input = await startSession(user);

    await user.click(screen.getByRole("button", { name: "Hint" }));
    await user.click(screen.getByRole("button", { name: "Hint" }));
    expect(screen.getByText("Hint: ho")).toBeVisible();
    await user.type(input, "house{Enter}");

    expect(screen.getByText("Correct, but you used a hint")).toBeVisible();
    await user.keyboard("{Enter}");
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ box: 1, correct: 0, wrong: 0 });
    });
  });

  it("FR-WR-4: disables the hint once the whole answer is revealed", async () => {
    await seedWords([["ja", "yes"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    for (let letter = 0; letter < 3; letter += 1) {
      await user.click(screen.getByRole("button", { name: "Hint" }));
    }

    expect(screen.getByRole("button", { name: "Hint" })).toBeDisabled();
  });

  it("FR-BP-11: has no axe violations on the answer feedback", async () => {
    await seedWords([["hus", "house"]]);
    const user = userEvent.setup();
    const { container } = render(<App />);
    const input = await startSession(user);
    await user.type(input, "hose{Enter}");

    expect(await axe(container)).toHaveNoViolations();
  });
});
