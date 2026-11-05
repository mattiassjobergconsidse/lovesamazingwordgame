import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { checkAnswer } from "../../core/checkAnswer";
import { acceptedAnswers, speechCodesFor } from "../../core/direction";
import {
  listeningFeedback,
  resolveListeningResult,
} from "../../core/listening";
import { buildQuizQuestion } from "../../core/quiz";
import { useListeningAudio } from "../../hooks/useListeningAudio";
import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";
import type { AnswerResult } from "../../types";
import { isModalOpen, isTypingTarget } from "../common/modalOpen";
import { SpeakButton } from "../common/SpeakButton";
import type { ModeCardProps } from "./BasicCard";

/** How long a correct answer stays on screen before the next card (as in Quiz, FR-QZ-2). */
const AUTO_ADVANCE_MS = 1000;

type InputMode = "choice" | "typing";

interface Outcome {
  /** What gets saved after replays and revealed text are taken into account. */
  readonly result: AnswerResult;
  /** The plain check of the answer, before any help is considered. */
  readonly checked: AnswerResult;
  readonly chosen: number | null;
}

/** Colour state of one option once the card is answered. */
function optionState(
  index: number,
  correctIndex: number,
  chosen: number | null,
  done: boolean,
): "idle" | "correct" | "wrong" {
  if (!done) {
    return "idle";
  }
  if (index === correctIndex) {
    return "correct";
  }
  return index === chosen ? "wrong" : "idle";
}

/**
 * Listening mode (NH-14): the app speaks the prompt-side word and the user picks or
 * types its translation in the other language. Remounted for every card, so all
 * state resets. Replaying the audio or showing the word makes a correct answer `assisted`.
 */
export function ListeningCard({
  set,
  direction,
  terms,
  pool,
  card,
  rng,
  onAnswer,
}: ModeCardProps) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [question] = useState(() =>
    buildQuizQuestion(card.pair, pool, direction, rng),
  );
  // A single-word set has nothing to choose between, so it is practised by typing.
  const canChoose = question.options.length >= 2;
  const [inputMode, setInputMode] = useState<InputMode>(
    canChoose ? "choice" : "typing",
  );
  const [typed, setTyped] = useState("");
  const [helped, setHelped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // The timer and the Next button can both finish the card; only the first may answer.
  const finishedRef = useRef(false);

  const codes = speechCodesFor(set, direction);
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const playAudio = useListeningAudio(terms.prompt, codes.prompt);

  const replay = useCallback(() => {
    setHelped(true);
    playAudio();
  }, [playAudio]);

  const settle = useCallback(
    (checked: AnswerResult, chosen: number | null) => {
      setOutcome(
        (current) =>
          current ?? {
            checked,
            chosen,
            result: resolveListeningResult(checked, helped || revealed),
          },
      );
    },
    [helped, revealed],
  );

  const choose = useCallback(
    (index: number) => {
      if (index >= 0 && index < question.options.length) {
        settle(index === question.correctIndex ? "correct" : "wrong", index);
      }
    },
    [settle, question.options.length, question.correctIndex],
  );

  const finish = useCallback(() => {
    if (finishedRef.current || outcome === null) {
      return;
    }
    finishedRef.current = true;
    onAnswer(outcome.result);
  }, [onAnswer, outcome]);

  useEffect(() => {
    if (inputMode === "typing" && outcome === null) {
      inputRef.current?.focus();
    }
  }, [inputMode, outcome]);

  useEffect(() => {
    if (outcome === null) {
      return;
    }
    // Enter on the focused Next button continues without leaving the keyboard.
    nextRef.current?.focus();
    if (outcome.result !== "correct") {
      return;
    }
    const timer = window.setTimeout(finish, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [outcome, finish]);

  useEffect(() => {
    if (outcome !== null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isModalOpen()) {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        replay();
        return;
      }
      if (inputMode === "choice" && /^[1-9]$/u.test(event.key)) {
        choose(Number(event.key) - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [outcome, inputMode, replay, choose]);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (outcome !== null || typed.trim() === "") {
      return;
    }
    const check = checkAnswer(typed, acceptedAnswers(terms), {
      ignoreAccents: settings.ignoreAccents,
    });
    settle(check.result, null);
  };

  const done = outcome !== null;
  const message =
    outcome === null
      ? null
      : t(
          `train.listening.${listeningFeedback(outcome.checked, outcome.result)}`,
          { answer: terms.answer },
        );

  return (
    <div className="session-card listening-card">
      <p className="session-card-label">
        {t("train.listening.prompt", { lang: promptLanguage })}
      </p>
      <div className="session-card-actions">
        <button
          type="button"
          className="button listening-replay"
          aria-keyshortcuts="r"
          disabled={done}
          onClick={replay}
        >
          <span aria-hidden="true">🔊 </span>
          {t("train.listening.replay")}
          <kbd className="key-hint" aria-hidden="true">
            R
          </kbd>
        </button>
        {!done && !revealed && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setRevealed(true);
            }}
          >
            {t("train.listening.reveal")}
          </button>
        )}
      </div>
      {revealed && !done && (
        <p className="session-card-term" role="status">
          {t("train.listening.revealed", { prompt: terms.prompt })}
        </p>
      )}

      {inputMode === "choice" ? (
        <ul
          className="quiz-options"
          aria-label={t("train.listening.options", { lang: answerLanguage })}
        >
          {question.options.map((option, index) => {
            const state = optionState(
              index,
              question.correctIndex,
              outcome?.chosen ?? null,
              done,
            );
            return (
              <li key={option}>
                <button
                  type="button"
                  className="button quiz-option"
                  data-state={state}
                  aria-disabled={done}
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
      ) : (
        <form className="listening-form" onSubmit={submit}>
          <label className="session-card-label" htmlFor="listening-answer">
            {t("train.listening.typeLabel", { lang: answerLanguage })}
          </label>
          <input
            ref={inputRef}
            id="listening-answer"
            className="writing-input"
            type="text"
            value={typed}
            readOnly={done}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
          />
          {!done && (
            <button type="submit" className="button">
              {t("train.listening.check")}
            </button>
          )}
        </form>
      )}

      {!done && canChoose && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setInputMode(inputMode === "choice" ? "typing" : "choice");
          }}
        >
          {inputMode === "choice"
            ? t("train.listening.useTyping")
            : t("train.listening.useChoices")}
        </button>
      )}

      {message !== null && (
        <>
          <p
            className="writing-message"
            role="status"
            data-result={outcome?.checked === "wrong" ? "incorrect" : "correct"}
          >
            {message}
          </p>
          <p className="session-card-label">
            {t("train.listening.meaning", {
              lang: promptLanguage,
              prompt: terms.prompt,
            })}
          </p>
          <SpeakButton text={terms.prompt} lang={codes.prompt} />
          <button
            ref={nextRef}
            type="button"
            className="button"
            onClick={finish}
          >
            {t("train.listening.next")}
          </button>
        </>
      )}
    </div>
  );
}
