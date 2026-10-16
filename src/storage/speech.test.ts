import { describe, expect, it, vi } from "vitest";
import {
  isSpeechSupported,
  listVoiceLanguages,
  onVoicesChanged,
  speak,
  stopSpeaking,
} from "./speech";

interface FakeSynthesis {
  readonly synthesis: SpeechSynthesis;
  readonly speak: ReturnType<typeof vi.fn>;
  readonly cancel: ReturnType<typeof vi.fn>;
  readonly addEventListener: ReturnType<typeof vi.fn>;
  readonly removeEventListener: ReturnType<typeof vi.fn>;
}

function fakeSynthesis(voiceLangs: readonly string[] = []): FakeSynthesis {
  const speakMock = vi.fn();
  const cancel = vi.fn();
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  const synthesis = {
    getVoices: () => voiceLangs.map((lang) => ({ lang })),
    speak: speakMock,
    cancel,
    addEventListener,
    removeEventListener,
  } as unknown as SpeechSynthesis;
  return {
    synthesis,
    speak: speakMock,
    cancel,
    addEventListener,
    removeEventListener,
  };
}

class FakeUtterance {
  lang = "";
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

describe("speech", () => {
  it("NH-2: reports no support in an environment without speechSynthesis", () => {
    expect(isSpeechSupported()).toBe(false);
    expect(listVoiceLanguages()).toEqual([]);
  });

  it("NH-2: lists distinct voice languages, sorted and with hyphenated tags", () => {
    const { synthesis } = fakeSynthesis(["sv_SE", "en-GB", "sv-SE", "en-GB"]);

    expect(listVoiceLanguages(synthesis)).toEqual(["en-GB", "sv-SE"]);
  });

  it("NH-2: speaks the text in the given language after cancelling earlier speech", () => {
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    const fake = fakeSynthesis();

    speak("hund", "sv-SE", fake.synthesis);

    expect(fake.cancel).toHaveBeenCalledOnce();
    expect(fake.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hund", lang: "sv-SE" }),
    );
    vi.unstubAllGlobals();
  });

  it("NH-2: does nothing without support", () => {
    expect(() => {
      speak("hund", "sv-SE", null);
      stopSpeaking(null);
    }).not.toThrow();
  });

  it("NH-2: stops speech on request", () => {
    const fake = fakeSynthesis();

    stopSpeaking(fake.synthesis);

    expect(fake.cancel).toHaveBeenCalledOnce();
  });

  it("NH-2: subscribes to voice changes and unsubscribes again", () => {
    const fake = fakeSynthesis();
    const listener = vi.fn();

    const unsubscribe = onVoicesChanged(listener, fake.synthesis);
    expect(fake.addEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      listener,
    );
    unsubscribe();

    expect(fake.removeEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      listener,
    );
  });
});
