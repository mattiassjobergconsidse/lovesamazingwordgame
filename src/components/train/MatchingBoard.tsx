import { useCallback, useEffect, useRef, useState } from "react";
import {
  attemptMatch,
  buildMatchingRound,
  type MatchItem,
} from "../../core/matching";
import type { Rng } from "../../core/shuffle";
import { useI18n } from "../../i18n";
import type { AnswerResult, WordPair, WordSet } from "../../types";
import { isModalOpen } from "../common/modalOpen";

/** How long a wrong pair stays marked (FR-MT-2). */
const WRONG_FLASH_MS = 500;
/** Pause after the last match so the user sees the finished round (FR-MT-2). */
const ROUND_END_MS = 600;

type Column = "left" | "right";

interface MatchingBoardProps {
  readonly set: WordSet;
  /** The words of this round (FR-MT-1); the board is remounted for every round. */
  readonly pairs: readonly WordPair[];
  readonly rng: Rng;
  /** Reports the first-attempt result of every word once all are matched (FR-MT-3). */
  readonly onComplete: (results: ReadonlyMap<string, AnswerResult>) => void;
}

interface Flash {
  readonly left: string;
  readonly right: string;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function labelFor(column: Column, index: number): string {
  return column === "left" ? String(index + 1) : (LETTERS[index] ?? "");
}

/**
 * Matching mode (FR-MT-*): two columns, tap a word and then its match. Also usable
 * with the keyboard: type the number and the letter, or move with the arrow keys.
 */
export function MatchingBoard({
  set,
  pairs,
  rng,
  onComplete,
}: MatchingBoardProps) {
  const { t } = useI18n();
  const [round] = useState(() => buildMatchingRound(pairs, rng));
  const [matched, setMatched] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<
    Readonly<Record<Column, string | null>>
  >({ left: null, right: null });
  const [results, setResults] = useState<ReadonlyMap<string, AnswerResult>>(
    new Map(),
  );
  const [flash, setFlash] = useState<Flash | null>(null);
  const [message, setMessage] = useState<"matched" | "noMatch" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftLanguage = round.swapped ? set.langB : set.langA;
  const rightLanguage = round.swapped ? set.langA : set.langB;
  const items: Readonly<Record<Column, readonly MatchItem[]>> = {
    left: round.left,
    right: round.right,
  };

  const select = useCallback(
    (column: Column, pairId: string) => {
      if (matched.has(pairId)) {
        return;
      }
      const next = {
        ...selected,
        [column]: selected[column] === pairId ? null : pairId,
      };
      const leftItem = round.left.find((item) => item.pairId === next.left);
      const rightItem = round.right.find((item) => item.pairId === next.right);
      if (leftItem === undefined || rightItem === undefined) {
        setSelected(next);
        return;
      }
      const attempt = attemptMatch(leftItem, rightItem, results);
      setResults(attempt.results);
      setSelected({ left: null, right: null });
      if (attempt.isMatch) {
        setMatched(new Set([...matched, leftItem.pairId]));
        setMessage("matched");
      } else {
        setFlash({ left: leftItem.pairId, right: rightItem.pairId });
        setMessage("noMatch");
      }
    },
    [matched, selected, round, results],
  );

  useEffect(() => {
    if (flash === null) {
      return;
    }
    const timer = window.setTimeout(() => {
      setFlash(null);
    }, WRONG_FLASH_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [flash]);

  useEffect(() => {
    if (matched.size < pairs.length) {
      return;
    }
    const timer = window.setTimeout(() => {
      onComplete(results);
    }, ROUND_END_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [matched, pairs.length, results, onComplete]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isModalOpen()) {
        return;
      }
      const key = event.key.toUpperCase();
      const leftItem = /^[1-9]$/u.test(key)
        ? round.left[Number(key) - 1]
        : undefined;
      const rightIndex = /^[A-Z]$/u.test(key) ? LETTERS.indexOf(key) : -1;
      const rightItem = round.right[rightIndex];
      if (leftItem !== undefined) {
        select("left", leftItem.pairId);
      } else if (rightItem !== undefined) {
        select("right", rightItem.pairId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [round, select]);

  const moveFocus = (column: Column, index: number, key: string) => {
    const target: [Column, number] | null =
      key === "ArrowDown"
        ? [column, index + 1]
        : key === "ArrowUp"
          ? [column, index - 1]
          : key === "ArrowLeft"
            ? ["left", index]
            : key === "ArrowRight"
              ? ["right", index]
              : null;
    if (target === null) {
      return false;
    }
    containerRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-column="${target[0]}"][data-index="${String(target[1])}"]`,
      )
      ?.focus();
    return true;
  };

  const renderColumn = (column: Column, language: string) => (
    <div className="match-column">
      <h2 className="session-card-label" id={`match-heading-${column}`}>
        {language}
      </h2>
      <ul className="match-list" aria-labelledby={`match-heading-${column}`}>
        {items[column].map((item, index) => {
          const isMatched = matched.has(item.pairId);
          const isWrong = flash?.[column] === item.pairId;
          const isSelected = selected[column] === item.pairId;
          const state = isMatched
            ? "matched"
            : isWrong
              ? "wrong"
              : isSelected
                ? "selected"
                : "idle";
          const label = labelFor(column, index);
          return (
            <li key={item.pairId}>
              <button
                type="button"
                className="button match-item"
                data-column={column}
                data-index={index}
                data-state={state}
                aria-pressed={isSelected}
                aria-disabled={isMatched}
                aria-keyshortcuts={label}
                onClick={() => {
                  select(column, item.pairId);
                }}
                onKeyDown={(event) => {
                  if (moveFocus(column, index, event.key)) {
                    event.preventDefault();
                  }
                }}
              >
                <kbd className="key-hint" aria-hidden="true">
                  {label}
                </kbd>
                {item.text}
                {isMatched && <span aria-hidden="true"> ✓</span>}
                {isWrong && <span aria-hidden="true"> ✗</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="session-card matching-board" ref={containerRef}>
      <p className="session-card-label">{t("train.matching.hint")}</p>
      <div className="match-columns">
        {renderColumn("left", leftLanguage)}
        {renderColumn("right", rightLanguage)}
      </div>
      <p className="writing-message" role="status">
        {message === "matched" && t("train.matching.matched")}
        {message === "noMatch" && t("train.matching.noMatch")}
      </p>
    </div>
  );
}
