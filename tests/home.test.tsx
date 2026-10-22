import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { localDateKey } from "../src/core/activity";
import {
  deleteAppDatabase,
  makePair,
  makeProgress,
  makeSettings,
  makeSet,
} from "./factories";
import { seedDatabase, setWithPairs } from "./seed";

afterEach(async () => {
  window.location.hash = "";
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

const GREETING = /^(Good morning|Good afternoon|Good evening|Hello, night owl)/;

describe("home screen (SPEC 7, #/)", () => {
  it("HOME-1: shows what is due, the four modes, the goal and a progress snapshot", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
      ["katt", "cat"],
    ]);
    const [first, second] = pairs;
    if (first === undefined || second === undefined) {
      throw new Error("expected seeded pairs");
    }
    await seedDatabase({
      sets: [set],
      pairs,
      progress: [
        // Due and hard.
        makeProgress({
          pairId: first.id,
          setId: set.id,
          box: 1,
          dueAt: 0,
          correct: 1,
          wrong: 3,
        }),
        // Mastered and not due.
        makeProgress({
          pairId: second.id,
          setId: set.id,
          box: 5,
          dueAt: Date.now() + 1e10,
          correct: 5,
        }),
      ],
      activity: [
        {
          id: `${set.id}:${localDateKey(Date.now())}`,
          setId: set.id,
          date: localDateKey(Date.now()),
          answered: 4,
          correct: 3,
        },
      ],
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(
      await screen.findByText("1 word is ready to practise today"),
    ).toBeInTheDocument();
    expect(screen.getByText(GREETING)).toBeInTheDocument();
    expect(
      screen.getByText("1 new word is waiting for you"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Practise due words" }),
    ).toHaveAttribute("href", "#/train/flashcards");
    expect(
      screen.getByRole("link", { name: "Practise your hardest words" }),
    ).toHaveAttribute("href", "#/train/flashcards/hardest");

    const modes = screen.getByRole("list", { name: "Choose how to practise" });
    for (const [name, mode] of [
      ["Flashcards", "flashcards"],
      ["Writing", "writing"],
      ["Quiz", "quiz"],
      ["Matching", "matching"],
    ] as const) {
      expect(
        within(modes).getByRole("link", { name: new RegExp(name) }),
      ).toHaveAttribute("href", `#/train/${mode}`);
    }

    expect(screen.getByText("4 of 10 answers today")).toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all statistics" }),
    ).toHaveAttribute("href", "#/stats");
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("HOME-1: says everything is done when nothing is due and offers practice anyway", async () => {
    const set = makeSet({ name: "Done" });
    const pairs = [makePair({ setId: set.id }), makePair({ setId: set.id })];
    await seedDatabase({
      sets: [set],
      pairs,
      progress: pairs.map((pair) =>
        makeProgress({
          pairId: pair.id,
          setId: set.id,
          box: 2,
          dueAt: Date.now() + 1e10,
        }),
      ),
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(
      await screen.findByText("All caught up! Nothing is due right now."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practise anyway" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Practise your hardest words" }),
    ).toBeNull();
    expect(screen.getByText("No answers yet")).toBeInTheDocument();
  });

  it("HOME-1: disables the modes a small set is too small for", async () => {
    const { set, pairs } = setWithPairs("One", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    await screen.findByRole("link", { name: /Flashcards/ });
    expect(screen.getByRole("link", { name: /Writing/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Quiz/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Matching/ })).toBeNull();
    expect(screen.getAllByText("Needs at least 2 words.")).toHaveLength(2);
  });

  it("NH-8: keeps mascot and emoji decoration out of the accessibility tree", async () => {
    const { set, pairs } = setWithPairs("Kids", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Choose how to practise",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    // Decorative, but it must be on screen and hidden from assistive technology.
    expect(screen.getByTestId("mascot")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Flashcards" })).toBeVisible();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("HOME-1: celebrates a reached daily goal", async () => {
    const { set, pairs } = setWithPairs("Busy", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      activity: [
        {
          id: `${set.id}:${localDateKey(Date.now())}`,
          setId: set.id,
          date: localDateKey(Date.now()),
          answered: 12,
          correct: 12,
        },
      ],
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(
      await screen.findByText("Goal reached, well done!"),
    ).toBeInTheDocument();
  });

  it("HOME-1: asks to add words to an empty set", async () => {
    const { set, pairs } = setWithPairs("Empty", []);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(
      await screen.findByRole("link", { name: "Add words in the set editor" }),
    ).toHaveAttribute("href", `#/sets/${set.id}`);
    expect(screen.queryByRole("link", { name: /Flashcards/ })).toBeNull();
  });

  it("HOME-1: without an active set it offers to choose or create one", async () => {
    await seedDatabase({ settings: makeSettings({ activeSetId: null }) });
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByText("Choose a word list to start practising."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a set" })).toHaveAttribute(
      "href",
      "#/sets",
    );
    const main = screen.getByRole("main");
    await user.click(within(main).getByRole("button", { name: "Choose set" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("HOME-1: measures today against the daily goal chosen in settings", async () => {
    const { set, pairs } = setWithPairs("Goal", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      activity: [
        {
          id: `${set.id}:${localDateKey(Date.now())}`,
          setId: set.id,
          date: localDateKey(Date.now()),
          answered: 4,
          correct: 4,
        },
      ],
      settings: makeSettings({ activeSetId: set.id }),
    });
    window.location.hash = "#/settings";
    const user = userEvent.setup();
    render(<App />);

    const select = await screen.findByRole("combobox", {
      name: "Answers per day",
    });
    expect(select).toHaveValue("10");
    await user.selectOptions(select, "5");
    window.location.hash = "#/";

    expect(await screen.findByText("4 of 5 answers today")).toBeInTheDocument();
  });

  it("HOME-1: uses a goal of 10 for settings saved before the goal existed", async () => {
    const { set, pairs } = setWithPairs("Old", [["hus", "house"]]);
    const older = Object.fromEntries(
      Object.entries(makeSettings({ activeSetId: set.id })).filter(
        ([key]) => key !== "dailyGoal",
      ),
    );
    await seedDatabase({
      sets: [set],
      pairs,
      // Saved by an earlier version, without the daily goal.
      settings: older as unknown as ReturnType<typeof makeSettings>,
    });
    render(<App />);

    expect(
      await screen.findByText("0 of 10 answers today"),
    ).toBeInTheDocument();
  });
});
