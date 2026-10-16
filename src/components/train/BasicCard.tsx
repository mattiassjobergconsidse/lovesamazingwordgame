import { useState } from "react";
import type { CardTerms } from "../../core/direction";
import { speechCodesFor } from "../../core/direction";
import type { SessionCard } from "../../core/session";
import type { Rng } from "../../core/shuffle";
import { useI18n } from "../../i18n";
import type { Direction, WordPair, WordSet } from "../../types";
import { SpeakButton } from "../common/SpeakButton";

/** What every training mode receives for the card it has to present. */
export interface ModeCardProps {
  readonly card: SessionCard;
  readonly set: WordSet;
  readonly direction: Direction;
  readonly terms: CardTerms;
  /** All pairs of the set, for modes that need other words (Quiz distractors). */
  readonly pool: readonly WordPair[];
  readonly rng: Rng;
  /** Reports the result; the shell saves progress and advances. */
  readonly onAnswer: (result: "correct" | "wrong" | "assisted") => void;
}

/**
 * Generic card used until a mode has its own UI (P4): reveal the answer, then self-grade.
 * Remounted for every card, so the revealed state resets.
 */
export function BasicCard({ set, direction, terms, onAnswer }: ModeCardProps) {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const codes = speechCodesFor(set, direction);

  return (
    <div className="session-card">
      <p className="session-card-label">
        {t("train.card.promptLabel", { lang: promptLanguage })}
      </p>
      <p className="session-card-term">{terms.prompt}</p>
      <SpeakButton text={terms.prompt} lang={codes.prompt} autoPlay />
      {revealed ? (
        <>
          <p className="session-card-label">
            {t("train.card.answerLabel", { lang: answerLanguage })}
          </p>
          <p className="session-card-term" aria-live="polite">
            {[terms.answer, ...terms.alternatives].join(" / ")}
          </p>
          <SpeakButton text={terms.answer} lang={codes.answer} />
          <div className="session-card-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                onAnswer("wrong");
              }}
            >
              {t("train.card.notYet")}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                onAnswer("correct");
              }}
            >
              {t("train.card.knew")}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="button"
          onClick={() => {
            setRevealed(true);
          }}
        >
          {t("train.card.show")}
        </button>
      )}
    </div>
  );
}
