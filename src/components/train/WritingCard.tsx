import {
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
  type RefObject,
} from "react";
import {
  checkAnswer,
  diffAnswer,
  hintPrefix,
  type AnswerCheck,
} from "../../core/checkAnswer";
import { acceptedAnswers } from "../../core/direction";
import { resolveWritingResult } from "../../core/writingResult";
import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";
import type { AnswerResult } from "../../types";
import type { ModeCardProps } from "./BasicCard";

/** How long a correct answer stays on screen before the next card (FR-WR-3). */
const AUTO_ADVANCE_MS = 800;

interface CheckedAnswer {
  readonly typed: string;
  readonly check: AnswerCheck;
  readonly result: AnswerResult;
  readonly usedHint: boolean;
}

/**
 * Writing mode (FR-WR-*): type the translation, get checked feedback with a diff
 * of mistakes. Remounted for every card, so all state resets.
 */
export function WritingCard({
  set,
  direction,
  terms,
  onAnswer,
}: ModeCardProps) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [typed, setTyped] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [checked, setChecked] = useState<CheckedAnswer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const answerLength = Array.from(terms.answer).length;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (checked === null) {
      return;
    }
    // Enter on the focused Next button continues without leaving the keyboard.
    nextRef.current?.focus();
    if (checked.result !== "correct") {
      return;
    }
    const timer = window.setTimeout(() => {
      onAnswer("correct");
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [checked, onAnswer]);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (checked !== null) {
      return;
    }
    const check = checkAnswer(typed, acceptedAnswers(terms), {
      ignoreAccents: settings.ignoreAccents,
    });
    const usedHint = hintCount > 0;
    setChecked({
      typed,
      check,
      usedHint,
      result: resolveWritingResult(check.result, usedHint),
    });
  };

  return (
    <form className="session-card writing-card" onSubmit={submit}>
      <p className="session-card-label">
        {t("train.card.promptLabel", { lang: promptLanguage })}
      </p>
      <p className="session-card-term">{terms.prompt}</p>
      <label className="session-card-label" htmlFor="writing-answer">
        {t("train.writing.answerLabel", { lang: answerLanguage })}
      </label>
      <input
        ref={inputRef}
        id="writing-answer"
        className="writing-input"
        type="text"
        value={typed}
        readOnly={checked !== null}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
      />
      {checked === null ? (
        <>
          {hintCount > 0 && (
            <p className="session-card-label">
              {t("train.writing.hintShown", {
                hint: hintPrefix(terms.answer, hintCount),
              })}
            </p>
          )}
          <div className="session-card-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={hintCount >= answerLength}
              onClick={() => {
                setHintCount((count) => count + 1);
              }}
            >
              {t("train.writing.hint")}
            </button>
            <button type="submit" className="button">
              {t("train.writing.check")}
            </button>
          </div>
        </>
      ) : (
        <WritingFeedback
          checked={checked}
          nextRef={nextRef}
          onNext={() => {
            onAnswer(checked.result);
          }}
          onOverride={() => {
            onAnswer("correct");
          }}
        />
      )}
    </form>
  );
}

interface WritingFeedbackProps {
  readonly checked: CheckedAnswer;
  readonly nextRef: RefObject<HTMLButtonElement | null>;
  readonly onNext: () => void;
  readonly onOverride: () => void;
}

function WritingFeedback({
  checked,
  nextRef,
  onNext,
  onOverride,
}: WritingFeedbackProps) {
  const { t } = useI18n();
  const { check, result, typed, usedHint } = checked;
  const isCorrect = result === "correct";
  const message = isCorrect
    ? t("train.writing.correct")
    : check.result === "correct" && usedHint
      ? t("train.writing.correctWithHint")
      : result === "assisted"
        ? t("train.writing.almost")
        : t("train.writing.wrong");

  return (
    <div
      className="writing-feedback"
      data-result={isCorrect ? "correct" : "incorrect"}
    >
      <p className="writing-message" role="status">
        <span aria-hidden="true">{isCorrect ? "✓ " : "✗ "}</span>
        {message}
      </p>
      {!isCorrect && (
        <>
          <p className="session-card-label">
            {t("train.writing.yourAnswer", { typed })}
          </p>
          <p className="session-card-term">
            <span className="session-card-label">
              {t("train.writing.correctAnswer")}{" "}
            </span>
            {diffAnswer(typed, check.closest).map((segment, index) => (
              <span
                key={`${String(index)}:${segment.text}`}
                className={segment.matches ? undefined : "writing-diff"}
              >
                {segment.text}
              </span>
            ))}
          </p>
        </>
      )}
      <div className="session-card-actions">
        {check.result === "wrong" && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onOverride}
          >
            {t("train.writing.iWasRight")}
          </button>
        )}
        <button ref={nextRef} type="button" className="button" onClick={onNext}>
          {t("train.writing.next")}
        </button>
      </div>
    </div>
  );
}
