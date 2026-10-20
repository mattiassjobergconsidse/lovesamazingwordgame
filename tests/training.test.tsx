import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { openAppDb } from "../src/storage/db";
import { deleteAppDatabase, makeProgress, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "#/train/flashcards";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedWeek(wordCount = 3) {
  const { set, pairs } = setWithPairs(
    "Week 1",
    Array.from({ length: wordCount }, (_, index) => [
      `ord${String(index)}`,
      `word${String(index)}`,
    ]),
  );
  await seedDatabase({
    sets: [set],
    pairs,
    settings: makeSettings({ activeSetId: set.id, directionMode: "AtoB" }),
  });
  return { set, pairs };
}

async function answerCurrentCard(user: UserEvent, label: string) {
  await user.click(await screen.findByRole("button", { name: "Show answer" }));
  await user.click(screen.getByRole("button", { name: label }));
}

async function readActivity() {
  const db = await openAppDb();
  try {
    return await db.getAll("activity");
  } finally {
    db.close();
  }
}

describe("training start", () => {
  it("FR-TRN-1: offers a session with all words of the active set", async () => {
    await seedWeek(3);
    render(<App />);

    expect(await screen.findByText("3 words in this session")).toBeVisible();
    expect(screen.getByRole("button", { name: "Start" })).toBeVisible();
    expect(screen.queryByText("Nothing due, extra practice")).toBeNull();
  });

  it("FR-TRN-9: says so when nothing is due and still lets the user practise", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({
      sets: [set],
      pairs,
      progress: pairs.map((pair) =>
        makeProgress({
          pairId: pair.id,
          setId: set.id,
          box: 4,
          dueAt: Date.now() + 1_000_000_000,
        }),
      ),
      settings: makeSettings({ activeSetId: set.id }),
    });
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByText("Nothing due, extra practice"),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(screen.getByText("0 / 2")).toBeVisible();
  });

  it("FR-ACT-1: asks for a set when none is active", async () => {
    await seedDatabase({});
    render(<App />);

    expect(
      await screen.findByText("Choose a set to start practising."),
    ).toBeVisible();
  });

  it("FR-BP-11: has no axe violations on the start panel", async () => {
    await seedWeek(3);
    const { container } = render(<App />);
    await screen.findByRole("button", { name: "Start" });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("running a session", () => {
  it("FR-TRN-3, FR-TRN-8: labels the prompt language and shows the progress", async () => {
    await seedWeek(3);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Start" }));

    expect(screen.getByText("Prompt (Svenska)")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Session progress",
    );
    expect(screen.getByText("0 / 3")).toBeVisible();

    await answerCurrentCard(user, "I knew it");

    expect(screen.getByText("1 / 3")).toBeVisible();
  });

  it("FR-TRN-4: saves progress and activity right after each first answer", async () => {
    const { set } = await seedWeek(3);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await answerCurrentCard(user, "I knew it");

    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress).toHaveLength(1);
      expect(progress[0]).toMatchObject({ setId: set.id, box: 1, correct: 1 });
    });
    const [activity] = await readActivity();
    expect(activity).toMatchObject({ setId: set.id, answered: 1, correct: 1 });
  });

  it("FR-TRN-5: shows the score and a perfect-session message at the end", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await answerCurrentCard(user, "I knew it");
    await answerCurrentCard(user, "I knew it");

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    expect(screen.getByText("2 of 2 correct")).toBeVisible();
    expect(screen.getByText(/^Time: \d+:\d{2}$/)).toBeVisible();
    expect(screen.getByText("No mistakes. Well done!")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Practise mistakes" }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "#/",
    );
  });

  it("FR-TRN-7, FR-TRN-4: repeats a wrong word once without counting it twice", async () => {
    const { set } = await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await answerCurrentCard(user, "Not yet");
    expect(screen.getByText("1 / 2")).toBeVisible();
    await answerCurrentCard(user, "I knew it");
    expect(screen.getByText("2 / 2")).toBeVisible();
    expect(screen.getByText("Repeat")).toBeVisible();
    await answerCurrentCard(user, "I knew it");

    expect(await screen.findByText("1 of 2 correct")).toBeVisible();
    const { progress } = await readLibrary();
    const wrongOne = progress.find((record) => record.wrong === 1);
    expect(wrongOne).toMatchObject({ setId: set.id, box: 1, correct: 0 });
    const [activity] = await readActivity();
    expect(activity).toMatchObject({ answered: 2, correct: 1 });
  });

  it("FR-TRN-5: lists mistakes and practises only those words", async () => {
    await seedWeek(3);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await answerCurrentCard(user, "Not yet");
    await answerCurrentCard(user, "I knew it");
    await answerCurrentCard(user, "I knew it");
    await answerCurrentCard(user, "I knew it");

    const review = await screen.findByRole("region", {
      name: "Words to review",
    });
    expect(within(review).getAllByRole("listitem")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Practise mistakes" }));

    expect(screen.getByText("0 / 1")).toBeVisible();
  });

  it("FR-TRN-5: practises again with a fresh session", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await answerCurrentCard(user, "I knew it");
    await answerCurrentCard(user, "I knew it");

    await user.click(
      await screen.findByRole("button", { name: "Practise again" }),
    );

    expect(screen.getByText("0 / 2")).toBeVisible();
  });

  it("FR-TRN-6: leaves the session with Escape without a confirmation", async () => {
    await seedWeek(3);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await answerCurrentCard(user, "I knew it");

    await user.keyboard("{Escape}");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Practise" }),
    ).toBeVisible();
    expect(window.location.hash).toBe("#/train");
    const { progress } = await readLibrary();
    expect(progress).toHaveLength(1);
  });

  it("FR-TRN-6: leaves the session with the Quit button", async () => {
    await seedWeek(3);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.click(screen.getByRole("button", { name: "Quit" }));

    expect(window.location.hash).toBe("#/train");
  });

  it("FR-TRN-2: builds a session of at most the configured size", async () => {
    const { set, pairs } = setWithPairs(
      "Big",
      Array.from({ length: 12 }, (_, index) => [
        `a${String(index)}`,
        `b${String(index)}`,
      ]),
    );
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id, sessionSize: 10 }),
    });
    render(<App />);

    expect(await screen.findByText("10 words in this session")).toBeVisible();
  });
});

describe("flashcards", () => {
  it("FR-FC-1, FR-FC-2: flips with Space and grades with the arrow keys", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.keyboard(" ");
    expect(screen.getByText("Answer (English)")).toBeVisible();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 / 2")).toBeVisible();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("2 / 2")).toBeVisible();
    expect(screen.getByText("Repeat")).toBeVisible();
  });

  it("FR-FC-2: ignores grade keys before the card is flipped", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.keyboard("2");

    expect(screen.getByText("0 / 2")).toBeVisible();
  });

  it("FR-FC-2: grades with the keys 1 and 2", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.keyboard(" 2");
    expect(screen.getByText("1 / 2")).toBeVisible();
    await user.keyboard(" 1");

    expect(screen.getByText("2 / 2")).toBeVisible();
    expect(screen.getByText("Repeat")).toBeVisible();
  });

  it("FR-FC-1: flips by clicking the card", async () => {
    await seedWeek(1);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.click(screen.getByText(/^ord\d$/));

    expect(screen.getByRole("button", { name: "I knew it" })).toBeVisible();
  });

  it("FR-FC-3: shows the answer with its alternatives on the back", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["stor", "big"]]);
    await seedDatabase({
      sets: [set],
      pairs: pairs.map((pair) => ({ ...pair, altB: ["large"] })),
      settings: makeSettings({ activeSetId: set.id, directionMode: "AtoB" }),
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.keyboard(" ");

    expect(screen.getByText("big / large")).toBeVisible();
    expect(screen.getByText("Answer (English)")).toBeVisible();
  });

  it("FR-FC-2: swiping right on the flipped card means correct", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.keyboard(" ");

    const card = screen.getByText(/^ord\d$/).closest(".flashcard");
    expect(card).not.toBeNull();
    if (card !== null) {
      fireEvent.pointerDown(card, { clientX: 20, clientY: 100 });
      fireEvent.pointerUp(card, { clientX: 160, clientY: 105 });
    }

    expect(await screen.findByText("1 / 2")).toBeVisible();
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ correct: 1 });
    });
  });

  it("FR-FC-2: swiping left on the flipped card means not yet", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.keyboard(" ");

    const card = screen.getByText(/^ord\d$/).closest(".flashcard");
    if (card !== null) {
      fireEvent.pointerDown(card, { clientX: 200, clientY: 100 });
      fireEvent.pointerUp(card, { clientX: 20, clientY: 100 });
    }

    expect(await screen.findByText("1 / 2")).toBeVisible();
    await waitFor(async () => {
      const { progress } = await readLibrary();
      expect(progress[0]).toMatchObject({ wrong: 1 });
    });
  });

  it("FR-FC-2: a short swipe does not grade", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.keyboard(" ");

    const card = screen.getByText(/^ord\d$/).closest(".flashcard");
    if (card !== null) {
      fireEvent.pointerDown(card, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(card, { clientX: 120, clientY: 100 });
    }

    expect(screen.getByText("0 / 2")).toBeVisible();
  });

  it("FR-FC-3: completes a 10-card session using only the keyboard", async () => {
    await seedWeek(10);
    const user = userEvent.setup();
    render(<App />);
    (await screen.findByRole("button", { name: "Start" })).focus();
    await user.keyboard("{Enter}");
    for (let card = 0; card < 10; card += 1) {
      await user.keyboard(" ");
      await user.keyboard("{ArrowRight}");
    }

    expect(await screen.findByText("10 of 10 correct")).toBeVisible();
  });

  it("FR-BP-11: has no axe violations on a flipped card", async () => {
    await seedWeek(2);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.keyboard(" ");

    expect(await axe(container)).toHaveNoViolations();
  });
});
