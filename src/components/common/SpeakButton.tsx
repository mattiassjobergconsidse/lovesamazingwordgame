import { useEffect, type MouseEvent } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useSpeech } from "../../hooks/useSpeech";
import { useI18n } from "../../i18n";

interface SpeakButtonProps {
  readonly text: string;
  /** BCP-47 tag of the set's voice language; without one there is nothing to speak with. */
  readonly lang: string | undefined;
  /** Read the text aloud when it appears, if the user turned that on (NH-2). */
  readonly autoPlay?: boolean;
}

/**
 * Speaker button that reads `text` aloud. Renders nothing when the browser has no
 * speech support or the set has no voice language. Speech stops when the card goes away.
 */
export function SpeakButton({
  text,
  lang,
  autoPlay = false,
}: SpeakButtonProps) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { supported, speak, stop } = useSpeech();
  const playOnShow = supported && autoPlay && settings.speechEnabled;

  useEffect(() => {
    if (playOnShow && lang !== undefined) {
      speak(text, lang);
    }
    return () => {
      stop();
    };
  }, [playOnShow, text, lang, speak, stop]);

  if (!supported || lang === undefined) {
    return null;
  }

  const language = lang;
  const onClick = (event: MouseEvent) => {
    // The button sits on cards that react to clicks (flip, continue).
    event.stopPropagation();
    speak(text, language);
  };

  return (
    <button
      type="button"
      className="icon-button"
      aria-label={t("speech.speak", { text })}
      onClick={onClick}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  );
}
