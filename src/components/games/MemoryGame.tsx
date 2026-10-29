import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  createMemoryGame,
  flipCard,
  hasMismatch,
  hideMismatch,
  isMemoryComplete,
} from "../../core/memoryGame";
import { useI18n } from "../../i18n";
import { GameResult } from "./GameResult";
import type { GameProps } from "./gameProps";

const COLUMNS = 4;
/** How long a mismatch stays visible before it is turned back. */
const MISMATCH_MS = 1000;

const rng = () => Math.random();

/** Moves focus between cards with the arrow keys; Enter and Space flip the focused card. */
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const offsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -COLUMNS,
    ArrowDown: COLUMNS,
  };
  const offset = offsets[event.key];
  if (offset === undefined) {
    return;
  }
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
  ];
  const current = buttons.findIndex(
    (button) => button === document.activeElement,
  );
  const target = buttons[current + offset];
  if (current >= 0 && target !== undefined) {
    event.preventDefault();
    target.focus();
  }
}

/** Emoji memory: find all matching pairs (NH-11). */
export function MemoryGame({ reducedMotion }: GameProps) {
  const { t } = useI18n();
  const [state, setState] = useState(() => createMemoryGame(rng));
  const mismatch = hasMismatch(state);
  const complete = isMemoryComplete(state);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boardRef.current?.querySelector("button")?.focus();
  }, []);

  useEffect(() => {
    // With reduced motion there is no timer: the next card turns the pair back.
    if (!mismatch || reducedMotion) {
      return;
    }
    const id = window.setTimeout(() => {
      setState(hideMismatch);
    }, MISMATCH_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [mismatch, reducedMotion, state.moves]);

  const flip = useCallback((index: number) => {
    setState((current) => flipCard(current, index));
  }, []);

  if (complete) {
    return (
      <GameResult
        emoji="🎉"
        message={t("game.memory.done", { moves: state.moves })}
      />
    );
  }

  return (
    <div className="game-play">
      <p className="game-status">
        {t("game.memory.moves", { moves: state.moves })}
      </p>
      {mismatch && reducedMotion && (
        <p className="game-hint" role="status">
          {t("game.memory.hint")}
        </p>
      )}
      <div
        ref={boardRef}
        className="memory-board"
        role="group"
        aria-label={t("game.memory.board")}
        onKeyDown={moveFocus}
      >
        {state.cards.map((card, index) => {
          const shown = card.matched || state.faceUp.includes(index);
          const n = index + 1;
          const label = card.matched
            ? t("game.memory.cardMatched", { n, emoji: card.emoji })
            : shown
              ? t("game.memory.cardShown", { n, emoji: card.emoji })
              : t("game.memory.cardHidden", { n });
          return (
            <button
              // Cards never reorder, so the position is a stable key.
              key={index}
              type="button"
              className={
                card.matched
                  ? "memory-card memory-card-matched"
                  : shown
                    ? "memory-card memory-card-shown"
                    : "memory-card"
              }
              aria-label={label}
              aria-disabled={card.matched}
              onClick={() => {
                flip(index);
              }}
            >
              <span aria-hidden="true">{shown ? card.emoji : "❓"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
