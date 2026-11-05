import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { buildQuizQuestion } from "../../core/quiz";
import { useI18n } from "../../i18n";
import { isModalOpen } from "../common/modalOpen";
import type { ModeCardProps } from "./BasicCard";

/** Short on purpose: a sprint must not wait for the feedback (NH-16). */
const FEEDBACK_MS = 350;

/**
 * One question of the Speed Round (NH-16): a Quiz question that answers by tap
 * or keys 1-9 and moves on after a brief feedback flash. Remounted for every
 * card, so the question and the choice reset.
 */
export function SpeedCard({
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
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const correctAnswer = question.options[question.correctIndex] ?? "";
  const report = useEffectEvent((index: number) => {
    onAnswer(index === question.correctIndex ? "correct" : "wrong");
  });

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
    const timer = window.setTimeout(() => {
      report(chosen);
    }, FEEDBACK_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [chosen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isModalOpen() ||
        !/^[1-9]$/u.test(event.key)
      ) {
        return;
      }
      choose(Number(event.key) - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [choose]);

  return (
    <div className="session-card quiz-card">
      <p className="session-card-label">
        {t("train.card.promptLabel", { lang: promptLanguage })}
      </p>
      <p className="session-card-term">{question.prompt}</p>
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
        <p className="writing-message" role="status">
          {chosen === question.correctIndex
            ? t("train.quiz.correct")
            : t("train.quiz.wrong", { answer: correctAnswer })}
        </p>
      )}
    </div>
  );
}
