import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { openAppDb } from "../src/storage/db";
import {
  LANGUAGE_MIRROR_KEY,
  THEME_MIRROR_KEY,
} from "../src/storage/preferenceMirror";
import { loadSettings, saveSettings } from "../src/storage/settingsRepo";
import { deleteAppDatabase, makeSettings } from "./factories";

beforeEach(() => {
  window.location.hash = "";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

describe("app shell", () => {
  it("FR-LANG-3: shows the home screen in the browser language with a matching lang attribute", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Home");
    expect(document.documentElement.lang).toBe("en");
  });

  it("lists the main navigation and marks the current page", () => {
    render(<App />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });

    expect(nav).toHaveTextContent("Sets");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("moves focus to the new screen's heading on navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Sets" }));

    const heading = await screen.findByRole("heading", { name: "Sets" });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(screen.getByRole("link", { name: "Sets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it.each([
    ["#/train/quiz", "Quiz"],
    ["#/sets/abc", "Edit set"],
    ["#/stats", "Statistics"],
    ["#/settings", "Settings"],
    ["#/nonsense", "Home"],
  ])("shows the screen for %s", (hash, title) => {
    window.location.hash = hash;

    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
  });

  it("skips to the main content", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("link", { name: "Skip to main content" }),
    );

    expect(screen.getByRole("main")).toHaveFocus();
    expect(window.location.hash).toBe("");
  });

  it("FR-ACT-2: offers to choose a set while none is active", () => {
    render(<App />);

    expect(
      screen.getByRole("region", { name: "Active set" }),
    ).toHaveTextContent("No set selected");
    expect(screen.getByRole("link", { name: "Choose set" })).toHaveAttribute(
      "href",
      "#/sets",
    );
  });
});

describe("theme", () => {
  it("FR-THEME-1: toggles between light and dark instantly and persists the choice", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_MIRROR_KEY)).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
    await waitFor(async () => {
      const db = await openAppDb();
      const stored = await loadSettings(db);
      db.close();
      expect(stored?.theme).toBe("dark");
    });
  });

  it("FR-THEME-1: applies the stored theme on startup", async () => {
    const db = await openAppDb();
    await saveSettings(db, makeSettings({ theme: "dark" }));
    db.close();

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });
});

describe("language", () => {
  it("FR-I18N-1: switches language at runtime and persists it", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Switch language" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Hem" }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("sv");
    expect(localStorage.getItem(LANGUAGE_MIRROR_KEY)).toBe("sv");
    expect(screen.getByRole("button", { name: "Byt språk" })).toHaveTextContent(
      "EN",
    );
  });

  it("FR-I18N-1: restores the stored language", async () => {
    const db = await openAppDb();
    await saveSettings(db, makeSettings({ uiLanguage: "sv" }));
    db.close();

    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Hem" }),
    ).toBeInTheDocument();
  });
});

describe("storage problems", () => {
  it("FR-BP-4: tells the user when storage is unavailable", () => {
    vi.stubGlobal("indexedDB", undefined);

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage is not available in this browser",
    );
  });
});

describe("accessibility", () => {
  it("FR-BP-11: has no axe violations in English", async () => {
    const { container } = render(<App />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("FR-BP-11: has no axe violations in Swedish with a storage error", async () => {
    vi.stubGlobal("indexedDB", undefined);
    localStorage.setItem(LANGUAGE_MIRROR_KEY, "sv");
    const { container } = render(<App />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
