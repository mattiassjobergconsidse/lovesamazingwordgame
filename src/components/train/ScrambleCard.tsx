import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyHint,
  createScramble,
  giveUp,
  isFullButWrong,
  placeLetter,
  placeTile,
  removeLastTile,
  removeTile,
  scrambleResult,
  scrambleSlots,
  scrambleStatus,
} from "../../core/scramble";
import { speechCodesFor } from "../../core/direction";
import { useI18n } from "../../i18n";
import { isModalOpen } from "../common/modalOpen";
import { SpeakButton } from "../common/SpeakButton";
import type { ModeCardProps } from "./BasicCard";

/** How long a solved word stays visible before the next one (like Writing, FR-WR-3). */
const AUTO_ADVANCE_MS = 800;

/**
 * Word Scramble mode (NH-13): build the answer from shuffled letter tiles, by tapping
 * or typing. Solved is `correct` (`assisted` after a hint), giving up is `wrong`.
 * Remounted for every card, so the round resets.
 */
export function ScrambleCard({
  set,
  direction,
  terms,
  rng,
  onAnswer,
}: ModeCardProps) {
  const { t } = useI18n();
  const [round, setRound] = useState(() => createScramble(terms.answer, rng));
  const nextRef = useRef<HTMLButtonElement>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The timer and the Next button can both finish the card; only the first may answer.
  const finishedRef = useRef(false);

  const status = scrambleStatus(round);
  const result = scrambleResult(round);
  const slots = scrambleSlots(round);
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;
  const codes = speechCodesFor(set, direction);
  const playing = status === "playing";

  const finish = useCallback(() => {
    if (finishedRef.current || result === null) {
      return;
    }
    finishedRef.current = true;
    onAnswer(result);
  }, [onAnswer, result]);

  useEffect(() => {
    if (status === "playing") {
      return;
    }
    nextRef.current?.focus();
    if (result !== "correct") {
      return;
    }
    const timer = window.setTimeout(finish, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [status, result, finish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isModalOpen()) {
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        setRound(removeLastTile);
        return;
      }
      setRound((current) => placeLetter(current, event.key));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const maskedWord = slots
    .map((slot) => (slot.isLetter && slot.char === "" ? "_" : slot.char))
    .join("");
  const placedSet = new Set(round.placed);

  return (
    <div className="session-card scramble-card">
      <p className="session-card-label">
        {t("train.card.promptLabel", { lang: promptLanguage })}
      </p>
      <p className="session-card-term">{terms.prompt}</p>
      <SpeakButton text={terms.prompt} lang={codes.prompt} autoPlay />
      <p className="session-card-label">
        {t("train.scramble.answerLabel", { lang: answerLanguage })}
      </p>
      <div
        className="scramble-slots"
        role="group"
        aria-label={t("train.scramble.wordAria", { word: maskedWord })}
      >
        {slots.map((slot, index) => {
          if (!slot.isLetter) {
            return (
              <span
                // The word is fixed for the whole card, so the position is a stable key.
                key={index}
                className="scramble-fixed"
                data-space={slot.char.trim() === ""}
                aria-hidden="true"
              >
                {slot.char}
              </span>
            );
          }
          const { tileIndex } = slot;
          if (tileIndex === null) {
            return (
              <span
                key={index}
                className="scramble-slot"
                data-filled="false"
                data-missed={status === "gaveUp"}
                aria-hidden="true"
              >
                {slot.char}
              </span>
            );
          }
          return (
            <button
              key={index}
              type="button"
              className="scramble-slot"
              data-filled="true"
              data-wrong={isFullButWrong(round)}
              aria-disabled={!playing}
              aria-label={t("train.scramble.removeLetter", {
                letter: slot.char,
              })}
              onClick={() => {
                setRound((current) => removeTile(current, tileIndex));
                // The slot unmounts as a button; keep keyboard focus on the freed tile.
                tileRefs.current[tileIndex]?.focus();
              }}
            >
              {slot.char}
            </button>
          );
        })}
      </div>
      <p
        className="writing-message"
        role="status"
        data-result={status === "gaveUp" ? "incorrect" : "correct"}
      >
        {status === "solved" &&
          t(
            result === "assisted"
              ? "train.scramble.solvedWithHint"
              : "train.scramble.solved",
            { answer: round.answer },
          )}
        {status === "gaveUp" &&
          t("train.scramble.gaveUp", { answer: round.answer })}
        {playing && isFullButWrong(round) && t("train.scramble.notQuite")}
      </p>
      <ul className="scramble-tiles" aria-label={t("train.scramble.tiles")}>
        {round.tiles.map((letter, index) => (
          <li
            // Tiles never reorder during a card, so the position is a stable key.
            key={index}
          >
            <button
              ref={(element) => {
                tileRefs.current[index] = element;
              }}
              type="button"
              className="button scramble-tile"
              data-used={placedSet.has(index)}
              aria-disabled={placedSet.has(index) || !playing}
              onClick={() => {
                setRound((current) => placeTile(current, index));
              }}
            >
              {letter}
            </button>
          </li>
        ))}
      </ul>
      {playing ? (
        <div className="session-card-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setRound(applyHint);
            }}
          >
            {t("train.scramble.hint")}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setRound(giveUp);
            }}
          >
            {t("train.scramble.giveUp")}
          </button>
        </div>
      ) : (
        <>
          <SpeakButton text={round.answer} lang={codes.answer} />
          <button
            ref={nextRef}
            type="button"
            className="button"
            onClick={finish}
          >
            {t("train.scramble.next")}
          </button>
        </>
      )}
    </div>
  );
}
