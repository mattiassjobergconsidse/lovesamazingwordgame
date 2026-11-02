import { useCallback, useEffect } from "react";
import { speak, stopSpeaking } from "../storage/speech";

/**
 * Speaks `text` once when the card appears and returns a function that speaks it again (NH-14).
 * Unlike the speaker button it ignores the auto-play setting: hearing the word is the
 * whole point of the mode. Speech stops when the card goes away.
 *
 * @param text The word to speak.
 * @param lang BCP-47 voice tag; without one nothing is spoken.
 */
export function useListeningAudio(
  text: string,
  lang: string | undefined,
): () => void {
  useEffect(() => {
    if (lang !== undefined) {
      speak(text, lang);
    }
    return () => {
      stopSpeaking();
    };
  }, [text, lang]);

  return useCallback(() => {
    if (lang !== undefined) {
      speak(text, lang);
    }
  }, [text, lang]);
}
