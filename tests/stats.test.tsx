import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { localDateKey } from "../src/core/activity";
import { deleteAppDatabase, makeProgress, makeSettings } from "./factories";
import { seedDatabase, setWithPairs } from "./seed";

beforeEach(() => {
  window.location.hash = "#/stats";
});

afterEach(async () => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedStats() {
  const { set, pairs } = setWithPairs("Week 1", [
    ["hus", "house"],
    ["bil", "car"],
    ["katt", "cat"],
    ["hund", "dog"],
  ]);
  const idAt = (index: number) => pairs[index]?.id ?? "";
  const today = localDateKey(Date.now());
  await seedDatabase({
    sets: [set],
    pairs,
    progress: [
      makeProgress({
        pairId: idAt(0),
        setId: set.id,
        box: 1,
        dueAt: 0,
        correct: 1,
        wrong: 3,
      }),
      makeProgress({
        pairId: idAt(1),
        setId: set.id,
        box: 5,
        dueAt: Date.now() + 1e9,
        correct: 4,
        wrong: 0,
      }),
      makeProgress({
        pairId: idAt(2),
        setId: set.id,
        box: 3,
        dueAt: Date.now() + 1e9,
        correct: 1,
        wrong: 1,
      }),
    ],
    activity: [
      {
        id: `${set.id}:${today}`,
        setId: set.id,
        date: today,
        answered: 4,
        correct: 3,
      },
    ],
    settings: makeSettings({ activeSetId: set.id }),
  });
}

describe("statistics screen", () => {
  it("FR-ST-1: shows the numbers of the active set", async () => {
    await seedStats();
    render(<App />);

    const overview = await screen.findByRole("region", { name: "Overview" });
    const figure = (label: string) =>
      within(overview).getByText(label).closest("div");
    expect(figure("Words")).toHaveTextContent("4");
    expect(figure("New")).toHaveTextContent("1");
    expect(figure("Learning")).toHaveTextContent("2");
    expect(figure("Mastered")).toHaveTextContent("1");
    expect(figure("Due now")).toHaveTextContent("1");
    expect(figure("Accuracy")).toHaveTextContent("75%");
    expect(figure("Practice streak")).toHaveTextContent("1 day");
  });

  it("FR-ST-2: lists the hardest words and links to a session with them", async () => {
    await seedStats();
    render(<App />);

    const hardest = await screen.findByRole("region", {
      name: "Hardest words",
    });
    const items = within(hardest).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("hus – house");
    expect(items[0]).toHaveTextContent("3 wrong of 4");
    expect(items[1]).toHaveTextContent("katt – cat");
    expect(
      within(hardest).getByRole("link", { name: "Practise these" }),
    ).toHaveAttribute("href", "#/train/flashcards/hardest");
  });

  it("FR-ST-2: a session from the link contains only the hard words", async () => {
    await seedStats();
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("link", { name: "Practise these" }),
    );

    expect(await screen.findByText("2 words in this session")).toBeVisible();
  });

  it("FR-ST-2: explains when there are no hard words", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    render(<App />);

    expect(await screen.findByText(/No hard words yet/)).toBeVisible();
    expect(screen.queryByRole("link", { name: "Practise these" })).toBeNull();
  });

  it("FR-ST-3: draws the last 14 days as a labelled chart", async () => {
    await seedStats();
    render(<App />);

    const chart = await screen.findByRole("img", {
      name: "Answers per day over the last 14 days",
    });
    expect(chart.querySelectorAll("title")).toHaveLength(14);
    expect(within(chart).getByText(/3 of 4 correct/)).toBeInTheDocument();
  });

  it("FR-ST-1: asks to choose a set when none is active", async () => {
    await seedDatabase({ settings: makeSettings({ activeSetId: null }) });
    render(<App />);

    expect(
      await screen.findByText("Choose a set to see its statistics."),
    ).toBeVisible();
  });

  it("FR-BP-11: has no accessibility violations", async () => {
    await seedStats();
    const { container } = render(<App />);
    await screen.findByRole("region", { name: "Overview" });

    expect(await axe(container)).toHaveNoViolations();
  });
});
