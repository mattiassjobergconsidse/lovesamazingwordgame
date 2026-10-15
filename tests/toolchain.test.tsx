import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import App from "../src/App";

/**
 * Smoke test for the test toolchain (jsdom, Testing Library, user-event, jest-dom, vitest-axe, fake-indexeddb).
 * Temporary: replace with real app-shell tests in phase P0.
 */
describe("test toolchain", () => {
  it("renders the app and reacts to user input", async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole("button", { name: /count is 0/i });
    await user.click(button);

    expect(
      screen.getByRole("button", { name: /count is 1/i }),
    ).toBeInTheDocument();
  });

  it("finds no accessibility violations with axe", async () => {
    const { container } = render(<App />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it("provides an in-memory IndexedDB", () => {
    expect(globalThis.indexedDB).toBeDefined();
  });
});
