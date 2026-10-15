import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n";
import { useToast } from "../../hooks/useToast";
import { ToastProvider } from "./ToastProvider";

function Trigger({ onAction }: { readonly onAction?: () => void }) {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        showToast({
          message: "Word removed",
          actionLabel: "Undo",
          ...(onAction === undefined ? {} : { onAction }),
        });
      }}
    >
      Show
    </button>
  );
}

function renderToast(onAction?: () => void) {
  return render(
    <I18nProvider language="en">
      <ToastProvider>
        <Trigger {...(onAction === undefined ? {} : { onAction })} />
      </ToastProvider>
    </I18nProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider", () => {
  it("FR-SET-6: disappears after 5 seconds", () => {
    vi.useFakeTimers();
    renderToast();

    act(() => {
      screen.getByRole("button", { name: "Show" }).click();
    });
    expect(screen.getByText("Word removed")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByText("Word removed")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText("Word removed")).not.toBeInTheDocument();
  });

  it("FR-SET-6: runs the action and closes when the action button is used", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    renderToast(onAction);

    await user.click(screen.getByRole("button", { name: "Show" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.queryByText("Word removed")).not.toBeInTheDocument();
  });

  it("FR-SET-6: restarts the timer when a new toast replaces the old one", () => {
    vi.useFakeTimers();
    renderToast();
    const show = screen.getByRole("button", { name: "Show" });

    act(() => {
      show.click();
      vi.advanceTimersByTime(4000);
      show.click();
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText("Word removed")).toBeInTheDocument();
  });
});

describe("useToast", () => {
  it("throws outside a ToastProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
  });
});
