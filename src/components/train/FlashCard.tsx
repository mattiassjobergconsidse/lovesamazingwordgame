import { useEffect, useRef, useState, type PointerEvent } from "react";
import { acceptedAnswers, speechCodesFor } from "../../core/direction";
import {
  flashcardActionForKey,
  gradeFromSwipe,
} from "../../core/flashcardInput";
import { useI18n } from "../../i18n";
import { SpeakButton } from "../common/SpeakButton";
import type { ModeCardProps } from "./BasicCard";

interface SwipeStart {
  readonly x: number;
  readonly y: number;
}

/**
 * Flashcards mode (FR-FC-*): a card that flips to show the answer, graded with
 * two buttons, the keyboard (Space, arrows, 1/2) or a swipe. Remounted for every
 * card, so the flipped state resets.
 */
export function FlashCard({ set, direction, terms, onAnswer }: ModeCardProps) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const backRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<SwipeStart | null>(null);
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const codes = speechCodesFor(set, direction);

  useEffect(() => {
    // Moves focus to the answer so screen readers read it and Space cannot grade by accident.
    if (flipped) {
      backRef.current?.focus();
    }
  }, [flipped]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = flashcardActionForKey(event.key);
      if (action === null || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (action === "flip") {
        // A focused button already reacts to Space itself.
        if (!flipped && !(event.target instanceof HTMLButtonElement)) {
          event.preventDefault();
          setFlipped(true);
        }
      } else if (flipped) {
        onAnswer(action);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [flipped, onAnswer]);

  const onPointerDown = (event: PointerEvent) => {
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null || !flipped) {
      return;
    }
    const grade = gradeFromSwipe(
      event.clientX - start.x,
      event.clientY - start.y,
    );
    if (grade !== null) {
      onAnswer(grade);
    }
  };

  return (
    <div className="flashcard-area">
      {/* The card is a pointer shortcut; the "Show answer" button is the accessible equivalent. */}
      <div
        className="flashcard"
        data-flipped={flipped}
        onClick={() => {
          setFlipped(true);
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        <div
          className="flashcard-face flashcard-front"
          aria-hidden={flipped}
          inert={flipped}
        >
          <p className="session-card-label">
            {t("train.card.promptLabel", { lang: promptLanguage })}
          </p>
          <p className="session-card-term">{terms.prompt}</p>
          <SpeakButton text={terms.prompt} lang={codes.prompt} autoPlay />
        </div>
        <div
          ref={backRef}
          className="flashcard-face flashcard-back"
          aria-hidden={!flipped}
          inert={!flipped}
          tabIndex={-1}
        >
          <p className="session-card-label">
            {t("train.card.answerLabel", { lang: answerLanguage })}
          </p>
          <p className="session-card-term">
            {acceptedAnswers(terms).join(" / ")}
          </p>
          <SpeakButton text={terms.answer} lang={codes.answer} />
        </div>
      </div>
      {flipped ? (
        <div className="session-card-actions">
          <button
            type="button"
            className="button button-secondary"
            aria-keyshortcuts="ArrowLeft 1"
            onClick={() => {
              onAnswer("wrong");
            }}
          >
            <span aria-hidden="true">← </span>
            {t("train.card.notYet")}
            <kbd className="key-hint" aria-hidden="true">
              1
            </kbd>
          </button>
          <button
            type="button"
            className="button"
            aria-keyshortcuts="ArrowRight 2"
            onClick={() => {
              onAnswer("correct");
            }}
          >
            {t("train.card.knew")}
            <span aria-hidden="true"> →</span>
            <kbd className="key-hint" aria-hidden="true">
              2
            </kbd>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="button"
          aria-keyshortcuts="Space"
          onClick={() => {
            setFlipped(true);
          }}
        >
          {t("train.card.show")}
        </button>
      )}
    </div>
  );
}
