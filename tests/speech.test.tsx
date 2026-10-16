import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { openAppDb } from "../src/storage/db";
import { loadSettings } from "../src/storage/settingsRepo";
import { deleteAppDatabase, makeSet, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

class FakeUtterance {
  lang = "";
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function stubSpeech() {
  const speak = vi.fn();
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [{ lang: "sv-SE" }, { lang: "en-GB" }],
    speak,
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  return speak;
}

beforeEach(() => {
  window.location.hash = "#/train/flashcards";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function seedWithVoices(speechEnabled = false) {
  const { pairs } = setWithPairs("Week 1", [["hund", "dog"]]);
  const set = makeSet({
    name: "Week 1",
    langACode: "sv-SE",
    langBCode: "en-GB",
  });
  await seedDatabase({
    sets: [set],
    pairs: pairs.map((pair) => ({ ...pair, setId: set.id })),
    settings: makeSettings({
      activeSetId: set.id,
      directionMode: "AtoB",
      speechEnabled,
    }),
  });
  return set;
}

describe("pronunciation", () => {
  it("NH-2: the speaker button reads the prompt in the set's voice language", async () => {
    const speak = stubSpeech();
    await seedWithVoices();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await user.click(
      await screen.findByRole("button", { name: "Listen to hund" }),
    );

    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hund", lang: "sv-SE" }),
    );
  });

  it("NH-2: does not read aloud on its own when the setting is off", async () => {
    const speak = stubSpeech();
    await seedWithVoices(false);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await screen.findByRole("button", { name: "Listen to hund" });

    expect(speak).not.toHaveBeenCalled();
  });

  it("NH-2: reads the prompt when a card appears if auto-play is on", async () => {
    const speak = stubSpeech();
    await seedWithVoices(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(
        expect.objectContaining({ text: "hund", lang: "sv-SE" }),
      );
    });
  });

  it("NH-2: hides the speaker button when the browser has no speech support", async () => {
    await seedWithVoices();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await screen.findByRole("button", { name: "Show answer" });

    expect(screen.queryByRole("button", { name: /^Listen to/u })).toBeNull();
  });

  it("NH-2: hides the speaker button for a set without a voice language", async () => {
    stubSpeech();
    const { set, pairs } = setWithPairs("Week 1", [["hund", "dog"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id, directionMode: "AtoB" }),
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await screen.findByRole("button", { name: "Show answer" });

    expect(screen.queryByRole("button", { name: /^Listen to/u })).toBeNull();
  });

  it("NH-2: the settings screen turns auto-play on and stores it", async () => {
    stubSpeech();
    await seedWithVoices();
    window.location.hash = "#/settings";
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("checkbox", {
        name: "Read each word aloud when a card appears",
      }),
    );

    await waitFor(async () => {
      const db = await openAppDb();
      try {
        expect(await loadSettings(db)).toMatchObject({ speechEnabled: true });
      } finally {
        db.close();
      }
    });
  });

  it("NH-2: the set editor stores the chosen voice language", async () => {
    stubSpeech();
    const { set, pairs } = setWithPairs("Week 1", [["hund", "dog"]]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ activeSetId: set.id }),
    });
    window.location.hash = `#/sets/${set.id}`;
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      await screen.findByLabelText("Voice for Svenska"),
      "sv-SE",
    );

    await waitFor(async () => {
      expect((await readLibrary()).sets).toMatchObject([
        { langACode: "sv-SE" },
      ]);
    });
  });
});
