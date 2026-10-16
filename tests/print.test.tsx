import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { seedDatabase, setWithPairs } from "./seed";

afterEach(async () => {
  vi.restoreAllMocks();
  window.location.hash = "";
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

describe("print view (NH-7)", () => {
  it("NH-7: offers a plain table of the whole set and a print button", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({ sets: [set], pairs, settings: makeSettings() });
    window.location.hash = `#/sets/${set.id}`;
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<App />);

    const table = await screen.findByRole("table", {
      name: "Printable word list",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("hus")).toBeInTheDocument();
    expect(within(table).getByText("car")).toBeInTheDocument();
    expect(await axe(table)).toHaveNoViolations();

    await user.click(
      screen.getByRole("button", { name: "Print the word list" }),
    );
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("NH-7: offers nothing to print for an empty set", async () => {
    const { set, pairs } = setWithPairs("Empty", []);
    await seedDatabase({ sets: [set], pairs, settings: makeSettings() });
    window.location.hash = `#/sets/${set.id}`;
    render(<App />);

    await screen.findByLabelText("Name");
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Print the word list" }),
    ).toBeNull();
  });
});
