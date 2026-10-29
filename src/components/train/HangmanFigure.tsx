import { MAX_WRONG_GUESSES } from "../../core/hangman";
import { useI18n } from "../../i18n";

/** Body parts in drawing order; one is added per wrong guess. */
const PARTS = [
  <circle key="head" cx="80" cy="42" r="12" />,
  <line key="body" x1="80" y1="54" x2="80" y2="92" />,
  <line key="left-arm" x1="80" y1="64" x2="62" y2="80" />,
  <line key="right-arm" x1="80" y1="64" x2="98" y2="80" />,
  <line key="left-leg" x1="80" y1="92" x2="64" y2="116" />,
  <line key="right-leg" x1="80" y1="92" x2="96" y2="116" />,
] as const;

interface HangmanFigureProps {
  /** Number of wrong guesses so far, 0 to {@link MAX_WRONG_GUESSES}. */
  readonly wrong: number;
}

/** Gallows with a figure that grows by one part per wrong guess (NH-9). */
export function HangmanFigure({ wrong }: HangmanFigureProps) {
  const { t } = useI18n();
  return (
    <svg
      className="hangman-figure"
      viewBox="0 0 120 130"
      role="img"
      aria-label={t("train.hangman.figure", {
        count: wrong,
        max: MAX_WRONG_GUESSES,
      })}
    >
      <g className="hangman-gallows">
        <line x1="10" y1="122" x2="70" y2="122" />
        <line x1="30" y1="122" x2="30" y2="10" />
        <line x1="30" y1="10" x2="80" y2="10" />
        <line x1="80" y1="10" x2="80" y2="30" />
      </g>
      <g className="hangman-person">{PARTS.slice(0, wrong)}</g>
    </svg>
  );
}
