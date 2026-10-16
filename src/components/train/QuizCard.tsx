import { useCallback, useEffect, useRef, useState } from "react";
import { buildQuizQuestion } from "../../core/quiz";
import { speechCodesFor } from "../../core/direction";
import { useI18n } from "../../i18n";
import { isModalOpen } from "../common/modalOpen";
import { SpeakButton } from "../common/SpeakButton";
import type { ModeCardProps } from "./BasicCard";

/** How long the feedback stays before the next question (FR-QZ-2). */
const AUTO_ADVANCE_MS = 1000;

const IGNORED_ADVANCE_KEYS = new Set([
  "Escape",
  "Tab",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "?",
]);

/**
 * Quiz mode (FR-QZ-*): choose the translation among options, by tap or keys 1-4.
 * Remounted for every card, so the question and the choice reset.
 */
export function QuizCard({
  card,
  set,
  direction,
  pool,
  rng,
  onAnswer,
}: ModeCardProps) {
  const { t } = useI18n();
  const [question] = useState(() =>
    buildQuizQuestion(card.pair, pool, direction, rng),
  );
  const [chosen, setChosen] = useState<number | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // The timer, a key press and a tap can all ask to continue; only the first may answer.
  const advancedRef = useRef(false);
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const correctAnswer = question.options[question.correctIndex] ?? "";

  const advance = useCallback(
    (index: number) => {
      if (advancedRef.current) {
        return;
      }
      advancedRef.current = true;
      onAnswer(index === question.correctIndex ? "correct" : "wrong");
    },
    [onAnswer, question.correctIndex],
  );

  const choose = useCallback(
    (index: number) => {
      if (chosen === null && index >= 0 && index < question.options.length) {
        setChosen(index);
      }
    },
    [chosen, question.options.length],
  );

  useEffect(() => {
    if (chosen === null) {
      return;
    }
    nextRef.current?.focus();
    const timer = window.setTimeout(() => {
      advance(chosen);
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [chosen, advance]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isModalOpen()) {
        return;
      }
      if (chosen === null) {
        if (/^[1-9]$/u.test(event.key)) {
          choose(Number(event.key) - 1);
        }
        return;
      }
      // A focused button already continues on Enter or Space by itself.
      const isButtonActivation =
        event.target instanceof HTMLButtonElement &&
        (event.key === "Enter" || event.key === " ");
      if (!IGNORED_ADVANCE_KEYS.has(event.key) && !isButtonActivation) {
        advance(chosen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [chosen, choose, advance]);

  const isCorrect = chosen === question.correctIndex;

  return (
    // A tap anywhere on the card continues; the Next button is the accessible equivalent.
    <div
      className="session-card quiz-card"
      onClick={() => {
        if (chosen !== null) {
          advance(chosen);
        }
      }}
    >
      <p className="session-card-label">
        {t("train.card.promptLabel", { lang: promptLanguage })}
      </p>
      <p className="session-card-term">{question.prompt}</p>
      <SpeakButton
        text={question.prompt}
        lang={speechCodesFor(set, direction).prompt}
        autoPlay
      />
      <ul
        className="quiz-options"
        aria-label={t("train.quiz.options", { lang: answerLanguage })}
      >
        {question.options.map((option, index) => {
          const state =
            chosen === null
              ? "idle"
              : index === question.correctIndex
                ? "correct"
                : index === chosen
                  ? "wrong"
                  : "idle";
          return (
            <li key={option}>
              <button
                type="button"
                className="button quiz-option"
                data-state={state}
                aria-disabled={chosen !== null}
                aria-keyshortcuts={String(index + 1)}
                onClick={() => {
                  choose(index);
                }}
              >
                <kbd className="key-hint" aria-hidden="true">
                  {index + 1}
                </kbd>
                {option}
                {state === "correct" && <span aria-hidden="true"> ✓</span>}
                {state === "wrong" && <span aria-hidden="true"> ✗</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {chosen !== null && (
        <>
          <p className="writing-message" role="status">
            {isCorrect
              ? t("train.quiz.correct")
              : t("train.quiz.wrong", { answer: correctAnswer })}
          </p>
          <button
            ref={nextRef}
            type="button"
            className="button button-secondary"
            onClick={() => {
              advance(chosen);
            }}
          >
            {t("train.quiz.next")}
          </button>
        </>
      )}
    </div>
  );
}
