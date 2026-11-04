import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import type { MascotEvent } from "../src/core/mascotPhrases";
import { en } from "../src/i18n/en";
import { sv } from "../src/i18n/sv";
import { SETTINGS_KEY, openAppDb } from "../src/storage/db";
import { loadSettings } from "../src/storage/settingsRepo";
import type { MascotId, Settings } from "../src/types";
import { deleteAppDatabase, makeSettings } from "./factories";
import { seedDatabase, setWithPairs } from "./seed";

afterEach(async () => {
  window.location.hash = "";
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

const MASCOTS = [
  "Volt",
  "Pyro",
  "Luna",
  "Scout",
  "Twinkle",
  "Shadow",
  "Sprout",
  "Raptor",
  "Jelly",
  "Golem",
  "Drake",
  "Amber",
] as const;

function pool(
  mascot: MascotId,
  event: MascotEvent,
  dictionary: Readonly<Record<string, string>> = en,
): string[] {
  return [1, 2, 3].map(
    (index) => dictionary[`mascot.${mascot}.${event}.${String(index)}`] ?? "",
  );
}

/** Waits for a speech bubble and returns its text. */
async function bubbleText(): Promise<string> {
  return waitFor(() => {
    const bubble = document.querySelector(".mascot-bubble");
    expect(bubble).not.toBeNull();
    return bubble?.textContent ?? "";
  });
}

async function seedWeek(
  wordCount: number,
  overrides: Partial<Settings> = {},
): Promise<void> {
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
    settings: makeSettings({
      activeSetId: set.id,
      directionMode: "AtoB",
      ...overrides,
    }),
  });
}

async function readStoredSettings() {
  const db = await openAppDb();
  try {
    return await loadSettings(db);
  } finally {
    db.close();
  }
}

describe("mascot picker (settings)", () => {
  beforeEach(() => {
    window.location.hash = "#/settings";
  });

  it("NH-12: previews every mascot and has Volt selected by default", async () => {
    await seedDatabase({});
    render(<App />);

    const group = await screen.findByRole("group", {
      name: "Choose your mascot",
    });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(MASCOTS.length);
    for (const name of MASCOTS) {
      expect(
        within(group).getByRole("radio", { name: new RegExp(`^${name}`) }),
      ).toBeInTheDocument();
    }
    expect(group.querySelectorAll("img")).toHaveLength(MASCOTS.length);
    expect(within(group).getByRole("radio", { name: /^Volt/ })).toBeChecked();
  });

  it("NH-12: saves the chosen mascot", async () => {
    await seedDatabase({});
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("radio", { name: /^Twinkle/ }));

    expect(screen.getByRole("radio", { name: /^Twinkle/ })).toBeChecked();
    await waitFor(async () => {
      expect((await readStoredSettings())?.mascot).toBe("twinkle");
    });
  });

  it("NH-12: can be operated with the keyboard only", async () => {
    await seedDatabase({});
    const user = userEvent.setup();
    render(<App />);
    const volt = await screen.findByRole("radio", { name: /^Volt/ });

    volt.focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("radio", { name: /^Pyro/ })).toBeChecked();
    await waitFor(async () => {
      expect((await readStoredSettings())?.mascot).toBe("pyro");
    });
  });

  it("NH-12: switches talking off and persists it", async () => {
    await seedDatabase({});
    const user = userEvent.setup();
    render(<App />);
    const talk = await screen.findByRole("checkbox", {
      name: "Let the mascot talk in speech bubbles",
    });
    expect(talk).toBeChecked();

    await user.click(talk);

    expect(talk).not.toBeChecked();
    await waitFor(async () => {
      expect((await readStoredSettings())?.mascotTalk).toBe(false);
    });
  });

  it("NH-12: loads older stored settings without mascot fields as Volt with talking on", async () => {
    const db = await openAppDb();
    // A record written before NH-12: the two mascot fields do not exist at all.
    const older = Object.fromEntries(
      Object.entries(makeSettings()).filter(
        ([key]) => key !== "mascot" && key !== "mascotTalk",
      ),
    );
    await db.put("settings", older as unknown as Settings, SETTINGS_KEY);
    db.close();
    render(<App />);

    expect(await screen.findByRole("radio", { name: /^Volt/ })).toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: "Let the mascot talk in speech bubbles",
      }),
    ).toBeChecked();
  });

  it("NH-12: has no axe violations", async () => {
    await seedDatabase({});
    const { container } = render(<App />);
    await screen.findByRole("group", { name: "Choose your mascot" });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("NH-12: is shown in Swedish", async () => {
    await seedDatabase({ settings: makeSettings({ uiLanguage: "sv" }) });
    render(<App />);

    expect(
      await screen.findByRole("group", { name: "Välj din maskot" }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", {
        name: "Låt maskoten prata i pratbubblor",
      }),
    ).toBeVisible();
  });
});

describe("talking mascot on the home screen", () => {
  beforeEach(() => {
    window.location.hash = "#/";
  });

  it("NH-12: greets with a phrase of the chosen mascot in a polite live region", async () => {
    await seedWeek(3, { mascot: "shadow" });
    render(<App />);

    const text = await bubbleText();

    expect(pool("shadow", "greeting")).toContain(text);
    const bubble = screen.getByText(text);
    expect(bubble.closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(bubble).not.toHaveFocus();
    expect(document.activeElement).not.toBe(bubble);
    expect(screen.getByTestId("mascot")).toHaveAttribute(
      "data-mascot",
      "shadow",
    );
  });

  it("NH-12: greets in Swedish when the UI is Swedish", async () => {
    await seedWeek(3, { uiLanguage: "sv", mascot: "jelly" });
    render(<App />);

    expect(pool("jelly", "greeting", sv)).toContain(await bubbleText());
  });

  it("NH-12: stays silent but still shows the mascot when talking is off", async () => {
    await seedWeek(3, { mascotTalk: false });
    render(<App />);

    expect(await screen.findByTestId("mascot")).toBeInTheDocument();
    expect(await screen.findByText("Practise today")).toBeVisible();
    expect(document.querySelector(".mascot-bubble")).toBeNull();
  });

  it("NH-12: keeps the artwork out of the accessibility tree and has no axe violations", async () => {
    await seedWeek(3);
    const { container } = render(<App />);
    await bubbleText();

    expect(screen.getByTestId("mascot")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("talking mascot while practising", () => {
  beforeEach(() => {
    window.location.hash = "#/train";
  });

  it("NH-12: speaks on the mode picker", async () => {
    await seedWeek(3);
    render(<App />);

    expect(pool("volt", "modeSelect")).toContain(await bubbleText());
  });
});

describe("talking mascot in a session", () => {
  beforeEach(() => {
    window.location.hash = "#/train/flashcards";
  });

  async function start(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: "Start" }));
  }

  async function answer(
    user: ReturnType<typeof userEvent.setup>,
    label: "I knew it" | "Not yet",
  ) {
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    await user.click(screen.getByRole("button", { name: label }));
  }

  it("NH-12: welcomes the user on the start panel", async () => {
    await seedWeek(3, { mascot: "pyro" });
    render(<App />);

    expect(pool("pyro", "modeSelect")).toContain(await bubbleText());
  });

  it("NH-12: stays quiet until the first answer, then reacts to a correct one", async () => {
    await seedWeek(5, { mascot: "twinkle" });
    const user = userEvent.setup();
    render(<App />);
    await start(user);

    expect(document.querySelector(".mascot-bubble")).toBeNull();
    await answer(user, "I knew it");

    expect(pool("twinkle", "correct")).toContain(await bubbleText());
  });

  it("NH-12: reacts to a wrong answer", async () => {
    await seedWeek(5, { mascot: "luna" });
    const user = userEvent.setup();
    render(<App />);
    await start(user);

    await answer(user, "Not yet");

    expect(pool("luna", "wrong")).toContain(await bubbleText());
  });

  it("NH-12: cheers about a streak of three correct answers", async () => {
    await seedWeek(5, { mascot: "volt" });
    const user = userEvent.setup();
    render(<App />);
    await start(user);

    await answer(user, "I knew it");
    await answer(user, "I knew it");
    await answer(user, "I knew it");

    expect(pool("volt", "streak")).toContain(await bubbleText());
  });

  it("NH-12: a wrong answer breaks the streak", async () => {
    await seedWeek(6, { mascot: "volt" });
    const user = userEvent.setup();
    render(<App />);
    await start(user);

    await answer(user, "I knew it");
    await answer(user, "I knew it");
    await answer(user, "Not yet");
    await answer(user, "I knew it");

    expect(pool("volt", "correct")).toContain(await bubbleText());
  });

  it("NH-12: never takes focus or blocks the card", async () => {
    await seedWeek(5);
    const user = userEvent.setup();
    render(<App />);
    await start(user);

    await answer(user, "I knew it");
    const text = await bubbleText();

    expect(screen.getByText(text).closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(document.querySelector(".mascot-stage-corner")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Show answer" })).toBeEnabled();
  });

  it("NH-12: says nothing during the session when talking is off", async () => {
    await seedWeek(5, { mascotTalk: false });
    const user = userEvent.setup();
    render(<App />);
    await start(user);

    await answer(user, "I knew it");
    await answer(user, "Not yet");

    expect(document.querySelector(".mascot-bubble")).toBeNull();
    expect(screen.queryByTestId("mascot")).toBeNull();
  });

  it("NH-12: celebrates the first trophy at the end of the session", async () => {
    await seedWeek(1, { mascot: "jelly" });
    const user = userEvent.setup();
    render(<App />);
    await start(user);

    await answer(user, "I knew it");

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    expect(pool("jelly", "trophy")).toContain(await bubbleText());
  });

  it("NH-12: comments on a session with mistakes when no trophy was won", async () => {
    await seedWeek(2, { mascot: "shadow" });
    const user = userEvent.setup();
    render(<App />);
    await start(user);
    // The first session always unlocks "First session", so finish one to use it up.
    await answer(user, "I knew it");
    await answer(user, "I knew it");
    await screen.findByRole("heading", { name: "Session complete" });
    await user.click(screen.getByRole("button", { name: "Practise again" }));

    await answer(user, "Not yet");
    await answer(user, "I knew it");
    await answer(user, "I knew it");

    expect(
      await screen.findByRole("button", { name: "Practise mistakes" }),
    ).toBeVisible();
    expect(pool("shadow", "sessionDone")).toContain(await bubbleText());
  });
});

describe("talking mascot on the trophy screen", () => {
  it("NH-12: congratulates on the trophy screen", async () => {
    window.location.hash = "#/trophies";
    await seedWeek(3, { mascot: "luna" });
    render(<App />);

    expect(pool("luna", "trophy")).toContain(await bubbleText());
  });
});
