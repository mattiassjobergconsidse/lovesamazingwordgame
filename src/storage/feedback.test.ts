import { describe, expect, it, vi } from "vitest";
import { TONES } from "../core/feedback";
import { playAnswerSound, vibrateForAnswer } from "./feedback";

function fakeContext(state: AudioContextState = "running") {
  const oscillator = {
    type: "",
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
  const context = {
    state,
    currentTime: 1,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: () => oscillator,
    createGain: () => gain,
  };
  return {
    context: context as unknown as AudioContext,
    oscillator,
    resume: context.resume,
  };
}

describe("playAnswerSound", () => {
  it("NH-4: plays the tone of the result", () => {
    const { context, oscillator } = fakeContext();
    playAnswerSound("wrong", context);
    expect(oscillator.frequency.value).toBe(TONES.wrong.frequency);
    expect(oscillator.start).toHaveBeenCalledWith(1);
    expect(oscillator.stop).toHaveBeenCalledWith(1 + TONES.wrong.duration);
  });

  it("NH-4: resumes a suspended context", () => {
    const { context, resume } = fakeContext("suspended");
    playAnswerSound("correct", context);
    expect(resume).toHaveBeenCalled();
  });

  it("NH-4: does nothing without audio support", () => {
    expect(() => {
      playAnswerSound("correct", null);
    }).not.toThrow();
  });
});

describe("vibrateForAnswer", () => {
  it("NH-4: vibrates with the pattern of the result", () => {
    const vibrate = vi.fn(() => true);
    vibrateForAnswer("wrong", { vibrate });
    expect(vibrate).toHaveBeenCalledWith([60, 40, 60]);
  });

  it("NH-4: ignores devices that cannot vibrate", () => {
    expect(() => {
      vibrateForAnswer("correct", {});
    }).not.toThrow();
  });
});
