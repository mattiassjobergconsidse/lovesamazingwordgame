import {
  listeningAvailability,
  type ListeningAvailability,
} from "../core/listening";
import { isSpeechSupported } from "../storage/speech";
import type { WordSet } from "../types";
import { useSettings } from "./useSettings";

/**
 * Whether Listening mode (NH-14) can be used with `set` in this browser.
 *
 * @param set The active set; `null` while none is chosen.
 */
export function useListeningAvailability(
  set: Pick<WordSet, "langACode" | "langBCode"> | null,
): ListeningAvailability {
  const { settings } = useSettings();
  return listeningAvailability(
    set ?? {},
    settings.directionMode,
    isSpeechSupported(),
  );
}
