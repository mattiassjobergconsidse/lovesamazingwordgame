import { speak, stopSpeaking, isSpeechSupported } from "../storage/speech";

/** Text-to-speech as the UI needs it (NH-2). */
export interface SpeechApi {
  /** Whether the browser can read text aloud; hide speech controls when false. */
  readonly supported: boolean;
  /** Reads text aloud in a BCP-47 language, replacing anything still being spoken. */
  readonly speak: (text: string, lang: string) => void;
  /** Stops any speech in progress. */
  readonly stop: () => void;
}

function stop(): void {
  stopSpeaking();
}

function say(text: string, lang: string): void {
  speak(text, lang);
}

/**
 * Gives components access to speech without importing from `storage/`.
 * `speak` and `stop` keep the same identity between renders, so they are safe effect dependencies.
 */
export function useSpeech(): SpeechApi {
  return { supported: isSpeechSupported(), speak: say, stop };
}
