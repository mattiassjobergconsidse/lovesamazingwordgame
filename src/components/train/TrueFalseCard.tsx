import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { speechCodesFor } from "../../core/direction";
import {
  buildTrueFalseProposal,
  judgeProposal,
  judgementForKey,
  judgementFromSwipe,
} from "../../core/trueFalse";
import { useI18n, type MessageKey } from "../../i18n";
import { isModalOpen } from "../common/modalOpen";
import { SpeakButton } from "../common/SpeakButton";
import type { ModeCardProps } from "./BasicCard";

/** How long the feedback stays before the next statement (as in Quiz, FR-QZ-2). */
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

interface SwipeStart {
  readonly x: number;
  readonly y: number;
}

/**
 * True or False mode (NH-17a): a prompt and a proposed translation; the user judges it
 * with the buttons, a swipe or the keys Left/1 and Right/2. Remounted for every card,
 * so the proposal and the judgement reset.
 */
export function TrueFalseCard({
  card,
  set,
  direction,
  pool,
  rng,
  onAnswer,
}: ModeCardProps) {
  const { t } = useI18n();
  const [proposal] = useState(() =>
    buildTrueFalseProposal(card.pair, pool, direction, rng),
  );
  const [judged, setJudged] = useState<boolean | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<SwipeStart | null>(null);
  // The timer, a key press and a tap can all ask to continue; only the first may answer.
  const advancedRef = useRef(false);
  const promptLanguage = direction === "AtoB" ? set.langA : set.langB;
  const answerLanguage = direction === "AtoB" ? set.langB : set.langA;

  const advance = useCallback(
    (judgedTrue: boolean) => {
      if (advancedRef.current) {
        return;
      }
      advancedRef.current = true;
      onAnswer(judgeProposal(proposal, judgedTrue));
    },
    [onAnswer, proposal],
  );

  const judge = useCallback(
    (judgedTrue: boolean) => {
      if (judged === null) {
        setJudged(judgedTrue);
      }
    },
    [judged],
  );

  useEffect(() => {
    if (judged === null) {
      return;
    }
    nextRef.current?.focus();
    // A wrong judgement stays on screen until the player presses Next.
    if (judged !== proposal.isTrue) {
      return;
    }
    const timer = window.setTimeout(() => {
      advance(judged);
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [judged, advance, proposal.isTrue]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isModalOpen()) {
        return;
      }
      if (judged === null) {
        const judgement = judgementForKey(event.key);
        if (judgement !== null) {
          judge(judgement);
        }
        return;
      }
      // A focused button already continues on Enter or Space by itself.
      const isButtonActivation =
        event.target instanceof HTMLButtonElement &&
        (event.key === "Enter" || event.key === " ");
      if (!IGNORED_ADVANCE_KEYS.has(event.key) && !isButtonActivation) {
        advance(judged);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [judged, judge, advance]);

  const onPointerDown = (event: PointerEvent) => {
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null || judged !== null) {
      return;
    }
    const judgement = judgementFromSwipe(
      event.clientX - start.x,
      event.clientY - start.y,
    );
    if (judgement !== null) {
      judge(judgement);
    }
  };

  const feedbackKey = (): MessageKey => {
    const right = judged === proposal.isTrue;
    if (right) {
      return proposal.isTrue
        ? "train.trueFalse.correctTrue"
        : "train.trueFalse.correctFalse";
    }
    return proposal.isTrue
      ? "train.trueFalse.wrongTrue"
      : "train.trueFalse.wrongFalse";
  };

  return (
    // A tap anywhere on the card continues once judged; the Next button is the accessible equivalent.
    <div
      className="session-card truefalse-card"
      onClick={() => {
        if (judged !== null) {
          advance(judged);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
    >
      <p className="session-card-label">
        {t("train.card.promptLabel", { lang: promptLanguage })}
      </p>
      <p className="session-card-term">{proposal.prompt}</p>
      <SpeakButton
        text={proposal.prompt}
        lang={speechCodesFor(set, direction).prompt}
        autoPlay
      />
      <p className="session-card-label">
        {t("train.trueFalse.question", { lang: answerLanguage })}
      </p>
      <p className="session-card-term truefalse-proposal">
        {proposal.proposed}
      </p>
      <div className="session-card-actions truefalse-actions">
        <button
          type="button"
          className="button truefalse-button"
          data-state={stateFor(judged, true, proposal.isTrue)}
          aria-disabled={judged !== null}
          aria-keyshortcuts="ArrowLeft 1"
          onClick={(event) => {
            event.stopPropagation();
            judge(true);
          }}
        >
          {t("train.trueFalse.true")}
          <span aria-hidden="true"> ✓ ←</span>
          <kbd className="key-hint" aria-hidden="true">
            1
          </kbd>
        </button>
        <button
          type="button"
          className="button button-secondary truefalse-button"
          data-state={stateFor(judged, false, proposal.isTrue)}
          aria-disabled={judged !== null}
          aria-keyshortcuts="ArrowRight 2"
          onClick={(event) => {
            event.stopPropagation();
            judge(false);
          }}
        >
          {t("train.trueFalse.false")}
          <span aria-hidden="true"> ✗ →</span>
          <kbd className="key-hint" aria-hidden="true">
            2
          </kbd>
        </button>
      </div>
      {judged !== null && (
        <>
          <p className="writing-message" role="status">
            {t(feedbackKey(), { answer: proposal.correctAnswer })}
          </p>
          <button
            ref={nextRef}
            type="button"
            className="button button-secondary"
            onClick={(event) => {
              event.stopPropagation();
              advance(judged);
            }}
          >
            {t("train.trueFalse.next")}
          </button>
        </>
      )}
    </div>
  );
}

/** Colours the chosen button green when the judgement was right and red when it was wrong. */
function stateFor(
  judged: boolean | null,
  button: boolean,
  isTrue: boolean,
): "idle" | "correct" | "wrong" {
  if (judged !== button) {
    return "idle";
  }
  return judged === isTrue ? "correct" : "wrong";
}
