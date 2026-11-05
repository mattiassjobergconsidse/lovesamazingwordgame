import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { seedDatabase, setWithPairs } from "./seed";

// A card that fails to render simulates a bug inside the Speed Round.
vi.mock("../src/components/train/SpeedCard", () => ({
  SpeedCard: (): never => {
    throw new Error("card exploded");
  },
}));

beforeEach(() => {
  window.location.hash = "#/train/speed";
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

describe("speed round error handling", () => {
  it("FR-BP-2: a failing question shows the error message and keeps the quit button", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Start" }, { timeout: 5_000 }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
    expect(screen.getByRole("button", { name: "Quit" })).toBeVisible();
  });
});
