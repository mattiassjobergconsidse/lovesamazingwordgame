import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { openAppDb } from "../src/storage/db";
import { loadSettings } from "../src/storage/settingsRepo";
import { deleteAppDatabase, makeSettings } from "./factories";
import { seedDatabase, setWithPairs } from "./seed";

const oscillator = {
  type: "",
  frequency: { value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => Promise.resolve());
  createOscillator = () => oscillator;
  createGain = () => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  });
}

function stubFeedbackApis() {
  const vibrate = vi.fn(() => true);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "vibrate", {
    value: vibrate,
    configurable: true,
  });
  return vibrate;
}

async function seedWithFeedback(overrides = {}) {
  const { set, pairs } = setWithPairs("Week 1", [["hund", "dog"]]);
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

beforeEach(() => {
  oscillator.start.mockClear();
  window.location.hash = "#/train/flashcards";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "vibrate");
  localStorage.clear();
  await deleteAppDatabase();
});

describe("answer feedback", () => {
  it("NH-4: is silent and still by default", async () => {
    const vibrate = stubFeedbackApis();
    await seedWithFeedback();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    await user.click(screen.getByRole("button", { name: "I knew it" }));

    expect(oscillator.start).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("NH-4: plays a tone and vibrates after an answer when switched on", async () => {
    const vibrate = stubFeedbackApis();
    await seedWithFeedback({ soundEnabled: true, hapticsEnabled: true });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    await user.click(screen.getByRole("button", { name: "Not yet" }));

    expect(oscillator.start).toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledWith([60, 40, 60]);
  });

  it("NH-4: the settings screen switches sound and vibration on and stores them", async () => {
    stubFeedbackApis();
    window.location.hash = "#/settings";
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("checkbox", {
        name: "Play a short sound after each answer",
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Vibrate briefly after each answer",
      }),
    );

    const db = await openAppDb();
    try {
      await vi.waitFor(async () => {
        expect(await loadSettings(db)).toMatchObject({
          soundEnabled: true,
          hapticsEnabled: true,
        });
      });
    } finally {
      db.close();
    }
  });

  it("NH-4: hides the switches when the browser supports neither", async () => {
    window.location.hash = "#/settings";
    render(<App />);
    await screen.findByRole("heading", { name: "Settings" });

    expect(screen.queryByText("Sounds and vibration")).toBeNull();
  });
});
