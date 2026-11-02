import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsContext } from "./settingsContext";
import { I18nProvider } from "../i18n";
import { en } from "../i18n/en";
import { makeSettings } from "../../tests/factories";
import type { Settings } from "../types";
import { MASCOT_BUBBLE_MS, useMascotSpeech } from "./useMascotSpeech";

function wrapperFor(settings: Settings) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <SettingsContext
        value={{ settings, ready: true, updateSettings: () => undefined }}
      >
        <I18nProvider language="en">{children}</I18nProvider>
      </SettingsContext>
    );
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMascotSpeech", () => {
  it("NH-12: is quiet until it is asked to say something", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings()),
    });

    expect(result.current.message).toBeNull();
    expect(result.current.mood).toBe("idle");
  });

  it("NH-12: says a phrase of the chosen mascot picked with the injected rng", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings({ mascot: "bubo" })),
    });

    act(() => {
      result.current.say("correct");
    });

    expect(result.current.message).toBe(en["mascot.bubo.correct.1"]);
    expect(result.current.mood).toBe("cheer");
  });

  it("NH-12: winces after a wrong answer", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings()),
    });

    act(() => {
      result.current.say("wrong");
    });

    expect(result.current.mood).toBe("oops");
  });

  it("NH-12: never repeats the same phrase twice in a row", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings()),
    });

    act(() => {
      result.current.say("correct");
    });
    const first = result.current.message;
    act(() => {
      result.current.say("correct");
    });

    expect(result.current.message).not.toBe(first);
  });

  it("NH-12: fades out after a few seconds", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings()),
    });
    act(() => {
      result.current.say("greeting");
    });

    act(() => {
      vi.advanceTimersByTime(MASCOT_BUBBLE_MS - 1);
    });
    expect(result.current.message).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.message).toBeNull();
  });

  it("NH-12: a new phrase restarts the timer", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings()),
    });
    act(() => {
      result.current.say("greeting");
    });
    act(() => {
      vi.advanceTimersByTime(MASCOT_BUBBLE_MS - 1000);
    });
    act(() => {
      result.current.say("correct");
    });
    act(() => {
      vi.advanceTimersByTime(MASCOT_BUBBLE_MS - 1000);
    });

    expect(result.current.message).not.toBeNull();
  });

  it("NH-12: clear silences it at once", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings()),
    });
    act(() => {
      result.current.say("greeting");
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.message).toBeNull();
  });

  it("NH-12: stays silent when talking is switched off", () => {
    const { result } = renderHook(() => useMascotSpeech(() => 0), {
      wrapper: wrapperFor(makeSettings({ mascotTalk: false })),
    });

    act(() => {
      result.current.say("greeting");
    });

    expect(result.current.message).toBeNull();
  });
});
