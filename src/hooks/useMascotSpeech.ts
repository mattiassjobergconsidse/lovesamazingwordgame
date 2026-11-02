import { useCallback, useEffect, useRef, useState } from "react";
import {
  mascotMoodFor,
  pickMascotPhrase,
  type MascotEvent,
  type MascotMood,
  type MascotPhraseIndex,
  type MascotPhraseKey,
} from "../core/mascotPhrases";
import { useI18n } from "../i18n";
import { useSettings } from "./useSettings";

/** How long a speech bubble stays before it fades out. */
export const MASCOT_BUBBLE_MS = 5000;

/** What the mascot currently says and how it moves; see {@link useMascotSpeech}. */
export interface MascotSpeech {
  /** The translated phrase, or `null` when the mascot is quiet or talking is switched off. */
  readonly message: string | null;
  readonly mood: MascotMood;
  /** Lets the mascot comment on an event. Does nothing while talking is switched off. */
  readonly say: (event: MascotEvent) => void;
  /** Silences the mascot immediately. */
  readonly clear: () => void;
}

interface Utterance {
  readonly id: number;
  readonly key: MascotPhraseKey;
  readonly mood: MascotMood;
}

/**
 * Owns the speech bubble of one mascot (NH-12): picks a random phrase per event,
 * never the same one twice in a row, and removes it again after a few seconds.
 *
 * @param rng Random source, injectable for tests.
 * @throws If used outside the settings and i18n providers.
 */
export function useMascotSpeech(rng: () => number = Math.random): MascotSpeech {
  const { t } = useI18n();
  const { settings, ready } = useSettings();
  const { mascot, mascotTalk } = settings;
  const [utterance, setUtterance] = useState<Utterance | null>(null);
  const previous = useRef<Partial<Record<MascotEvent, MascotPhraseIndex>>>({});
  const counter = useRef(0);

  const say = useCallback(
    (event: MascotEvent) => {
      // Before the stored settings are applied the chosen mascot is not known yet.
      if (!ready || !mascotTalk) {
        return;
      }
      const { key, index } = pickMascotPhrase(
        mascot,
        event,
        rng,
        previous.current[event],
      );
      previous.current[event] = index;
      counter.current += 1;
      setUtterance({
        id: counter.current,
        key,
        mood: mascotMoodFor(event),
      });
    },
    [mascot, mascotTalk, ready, rng],
  );

  const clear = useCallback(() => {
    setUtterance(null);
  }, []);

  const utteranceId = utterance?.id;
  useEffect(() => {
    if (utteranceId === undefined) {
      return;
    }
    const timer = setTimeout(() => {
      setUtterance(null);
    }, MASCOT_BUBBLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [utteranceId]);

  const visible = mascotTalk ? utterance : null;
  return {
    message: visible === null ? null : t(visible.key),
    mood: visible?.mood ?? "idle",
    say,
    clear,
  };
}
