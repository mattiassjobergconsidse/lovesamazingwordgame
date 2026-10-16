import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { seedDatabase } from "./seed";

afterEach(async () => {
  window.location.hash = "";
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function renderApp() {
  await seedDatabase({ sets: [], pairs: [], settings: makeSettings() });
  window.location.hash = "#/";
  render(<App />);
  await screen.findByRole("button", { name: "Keyboard shortcuts" });
}

describe("keyboard shortcut help (NH-6)", () => {
  it("NH-6: the ? key opens the list and Esc closes it", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.keyboard("?");
    const dialog = await screen.findByRole("dialog", {
      name: "Keyboard shortcuts",
    });
    expect(dialog).toHaveTextContent("Flip the card");
    expect(dialog).toHaveTextContent("Pick the word in the right column");
    expect(await axe(dialog)).toHaveNoViolations();

    // jsdom does not turn Esc into the dialog's cancel event, a real browser does.
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("NH-6: the header button opens the list without a keyboard", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      screen.getByRole("button", { name: "Keyboard shortcuts" }),
    );
    await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("NH-6: typing a question mark in a text field does not open the list", async () => {
    const user = userEvent.setup();
    await renderApp();
    const input = document.createElement("input");
    document.body.append(input);

    input.focus();
    await user.keyboard("?");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(input.value).toBe("?");
    input.remove();
  });
});
