import {
  speak,
  speakThen,
  stopSpeaking,
  isSpeechSupported,
} from "../storage/speech";

/** Text-to-speech as the UI needs it (NH-2). */
export interface SpeechApi {
  /** Whether the browser can read text aloud; hide speech controls when false. */
  readonly supported: boolean;
  /** Reads text aloud in a BCP-47 language, replacing anything still being spoken. */
  readonly speak: (text: string, lang: string) => void;
  /** Like `speak`, and calls the callback when the speech has ended or could not run. */
  readonly speakThen: (text: string, lang: string, onDone: () => void) => void;
  /** Stops any speech in progress. */
  readonly stop: () => void;
}

function stop(): void {
  stopSpeaking();
}

function say(text: string, lang: string): void {
  speak(text, lang);
}

function sayThen(text: string, lang: string, onDone: () => void): void {
  speakThen(text, lang, onDone);
}

/**
 * Gives components access to speech without importing from `storage/`.
 * `speak`, `speakThen` and `stop` keep the same identity between renders, so they are safe effect dependencies.
 */
export function useSpeech(): SpeechApi {
  return {
    supported: isSpeechSupported(),
    speak: say,
    speakThen: sayThen,
    stop,
  };
}
