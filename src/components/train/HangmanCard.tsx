import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_WRONG_GUESSES,
  answerSlots,
  createHangman,
  guessLetter,
  hangmanStatus,
  keyboardLetters,
  wrongGuesses,
} from "../../core/hangman";
import { speechCodesFor } from "../../core/direction";
import { useI18n } from "../../i18n";
import { isModalOpen } from "../common/modalOpen";
import { SpeakButton } from "../common/SpeakButton";
import type { ModeCardProps } from "./BasicCard";
import { HangmanFigure } from "./HangmanFigure";

/** How long a solved word stays visible before the next one (like Writing, FR-WR-3). */
const AUTO_ADVANCE_MS = 800;

/**
 * Hangman mode (NH-9): guess the hidden answer letter by letter, on the on-screen
 * keyboard or the physical one. Solved is `correct`, out of guesses is `wrong`.
 * Remounted for every card, so the round resets.
 */
export function HangmanCard({
  set,
  direction,
  terms,
  onAnswer,
}: ModeCardProps) {
  const { t } = useI18n();
  const [round, setRound] = useState(() => createHangman(terms.answer));
  const nextRef = useRef<HTMLButtonElement>(null);
  // The timer and the Next button can both finish the card; only the first may answer.
  const finishedRef = useRef(false);

  const status = hangmanStatus(round);
  const wrong = wrongGuesses(round);
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const slots = answerSlots(round, status === "lost");
  const codes = speechCodesFor(set, direction);

  const guess = useCallback((char: string) => {
    setRound((current) => guessLetter(current, char));
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    onAnswer(hangmanStatus(round) === "won" ? "correct" : "wrong");
  }, [onAnswer, round]);

  useEffect(() => {
    if (status === "playing") {
      return;
    }
    nextRef.current?.focus();
    if (status !== "won") {
      return;
    }
    const timer = window.setTimeout(finish, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [status, finish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isModalOpen()) {
        return;
      }
      guess(event.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [guess]);

  const maskedWord = slots
    .map((slot) => (slot.revealed ? slot.char : "_"))
    .join("");

  return (
    <div className="session-card hangman-card">
      <p className="session-card-label">
        {t("train.card.promptLabel", { lang: promptLanguage })}
      </p>
      <p className="session-card-term">{terms.prompt}</p>
      <SpeakButton text={terms.prompt} lang={codes.prompt} autoPlay />
      <HangmanFigure wrong={wrong.length} />
      <p className="session-card-label">
        {t("train.hangman.wordLabel", { lang: answerLanguage })}
      </p>
      <p
        className="hangman-word"
        role="img"
        aria-label={t("train.hangman.wordAria", { word: maskedWord })}
      >
        {slots.map((slot, index) => (
          <span
            // The word is fixed for the whole card, so the position is a stable key.
            key={index}
            className="hangman-slot"
            data-hidden={!slot.revealed}
            data-letter={slot.isLetter}
            data-missed={
              status === "lost" &&
              slot.isLetter &&
              !round.guessed.includes(slot.char.toLowerCase())
            }
            aria-hidden="true"
          >
            {slot.revealed ? slot.char : ""}
          </span>
        ))}
      </p>
      <p className="hangman-lives">
        {t("train.hangman.guessesLeft", {
          count: MAX_WRONG_GUESSES - wrong.length,
        })}
      </p>
      <ul className="hangman-keys" aria-label={t("train.hangman.keyboard")}>
        {keyboardLetters(round.answer).map((letter) => {
          const used = round.guessed.includes(letter);
          const missed = wrong.includes(letter);
          return (
            <li key={letter}>
              <button
                type="button"
                className="button hangman-key"
                data-state={!used ? "idle" : missed ? "wrong" : "correct"}
                aria-disabled={used || status !== "playing"}
                onClick={() => {
                  guess(letter);
                }}
              >
                {letter}
                {used && <span aria-hidden="true">{missed ? " ✗" : " ✓"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {status !== "playing" && (
        <>
          <p
            className="writing-message"
            role="status"
            data-result={status === "won" ? "correct" : "incorrect"}
          >
            {status === "won"
              ? t("train.hangman.won", { answer: round.answer })
              : t("train.hangman.lost", { answer: round.answer })}
          </p>
          <SpeakButton text={round.answer} lang={codes.answer} />
          <button
            ref={nextRef}
            type="button"
            className="button button-secondary"
            onClick={finish}
          >
            {t("train.hangman.next")}
          </button>
        </>
      )}
    </div>
  );
}
