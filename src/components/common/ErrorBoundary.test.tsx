import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Broken(): never {
  throw new Error("boom");
}

function renderBroken(onReload = vi.fn()) {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(
    <ErrorBoundary
      title="Something went wrong"
      message="Please reload."
      reloadLabel="Reload"
      onReload={onReload}
    >
      <Broken />
    </ErrorBoundary>,
  );
  return onReload;
}

describe("ErrorBoundary", () => {
  it("renders children when nothing fails", () => {
    render(
      <ErrorBoundary title="t" message="m" reloadLabel="r" onReload={vi.fn()}>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("FR-BP-2: shows a friendly message instead of a blank screen", () => {
    renderBroken();

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("Please reload.")).toBeInTheDocument();
  });

  it("FR-BP-2: offers a reload button", async () => {
    const onReload = renderBroken();

    await userEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(onReload).toHaveBeenCalledOnce();
  });
});
