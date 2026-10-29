import { useEffect, useRef, type ReactNode } from "react";
import { termsFor } from "../../core/direction";
import { sessionProgress } from "../../core/session";
import { AppErrorBoundary } from "../common/AppErrorBoundary";
import { isModalOpen } from "../common/modalOpen";
import { useAnswerFeedback } from "../../hooks/useAnswerFeedback";
import { useActiveSet } from "../../hooks/useActiveSet";
import { useTrophyCelebration } from "../../hooks/useTrophyCelebration";
import {
  useTrainingSession,
  type TrainingFocus,
} from "../../hooks/useTrainingSession";
import { useI18n, type MessageKey } from "../../i18n";
import { navigate, type TrainMode } from "../../router";
import type { WordSet } from "../../types";
import "../common/common.css";
import { roundAt } from "../../core/matching";
import { BasicCard, type ModeCardProps } from "./BasicCard";
import { FlashCard } from "./FlashCard";
import { HangmanCard } from "./HangmanCard";
import { MatchingBoard } from "./MatchingBoard";
import { MODE_ICONS } from "./modeIcons";
import { QuizCard } from "./QuizCard";
import { SessionResult } from "./SessionResult";
import { WritingCard } from "./WritingCard";
import "./train.css";

interface TrainSessionProps {
  readonly title: MessageKey;
  readonly mode: TrainMode;
  /** "hardest" practises only the set's hardest words (FR-ST-2). */
  readonly focus?: TrainingFocus;
  /** Renders the card of a mode; defaults to the generic reveal-and-grade card. */
  readonly renderCard?: (props: ModeCardProps) => ReactNode;
}

interface ActiveSessionProps extends TrainSessionProps {
  readonly set: WordSet;
}

function defaultRenderCard(props: ModeCardProps): ReactNode {
  return <BasicCard {...props} />;
}

function renderFlashCard(props: ModeCardProps): ReactNode {
  return <FlashCard {...props} />;
}

function renderQuizCard(props: ModeCardProps): ReactNode {
  return <QuizCard {...props} />;
}
function renderWritingCard(props: ModeCardProps): ReactNode {
  return <WritingCard {...props} />;
}

function renderHangmanCard(props: ModeCardProps): ReactNode {
  return <HangmanCard {...props} />;
}

/** Matching has its own board; the generic card is only a fallback. */
function cardRendererFor(mode: TrainMode): (props: ModeCardProps) => ReactNode {
  switch (mode) {
    case "flashcards":
      return renderFlashCard;
    case "writing":
      return renderWritingCard;
    case "quiz":
      return renderQuizCard;
    case "hangman":
      return renderHangmanCard;
    case "matching":
      return defaultRenderCard;
  }
}

function ActiveSession({
  set,
  title,
  mode,
  focus = "all",
  renderCard = cardRendererFor(mode),
}: ActiveSessionProps) {
  const { t, tp } = useI18n();
  const {
    view,
    plannedCount,
    extraPractice,
    card,
    pool,
    rng,
    start,
    practiseMistakes,
    answer,
    answerRound,
  } = useTrainingSession(set.id, undefined, focus);
  const giveFeedback = useAnswerFeedback();
  useTrophyCelebration(view, mode);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousStatus = useRef(view.status);
  const running = view.status === "running";

  useEffect(() => {
    // Keyboard and screen reader users land on the new phase's heading.
    if (previousStatus.current !== view.status) {
      // A mode card may already have focused its own control (e.g. the Writing input).
      const container = containerRef.current;
      if (!container?.contains(document.activeElement)) {
        container?.querySelector("h1")?.focus();
      }
      previousStatus.current = view.status;
    }
  }, [view.status]);

  useEffect(() => {
    if (!running) {
      return;
    }
    // Progress is saved after every answer, so leaving needs no confirmation (FR-TRN-6).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isModalOpen()) {
        navigate({ name: "train" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [running]);

  if (view.status === "finished") {
    return (
      <div ref={containerRef}>
        <SessionResult
          session={view.session}
          durationMs={view.durationMs}
          onPractiseMistakes={practiseMistakes}
          onPractiseAgain={start}
        />
      </div>
    );
  }

  if (view.status === "idle" || card === null) {
    return (
      <div ref={containerRef} className="session-start">
        <h1 tabIndex={-1}>
          <span className="mode-emoji" aria-hidden="true">
            {MODE_ICONS[mode]}
          </span>
          {t(title)}
        </h1>
        <p>{set.name}</p>
        <p>{tp("train.session.size", plannedCount)}</p>
        {extraPractice && <p>{t("train.session.extra")}</p>}
        {plannedCount === 0 ? (
          <p>{t("train.session.noHardWords")}</p>
        ) : (
          <button type="button" className="button" onClick={start}>
            {t("train.session.start")}
          </button>
        )}
      </div>
    );
  }

  const { answered, total } = sessionProgress(view.session);
  const terms = termsFor(card.pair, view.direction);
  return (
    <div ref={containerRef} className="session">
      <div className="session-header">
        <h1 tabIndex={-1}>
          <span className="mode-emoji" aria-hidden="true">
            {MODE_ICONS[mode]}
          </span>
          {t(title)}
        </h1>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            navigate({ name: "train" });
          }}
        >
          {t("train.session.quit")}
        </button>
      </div>
      <div className="session-progress">
        <progress
          aria-label={t("train.session.progressLabel")}
          max={total}
          value={answered}
        />
        <span>{t("train.session.progress", { done: answered, total })}</span>
        {card.isRepeat && (
          <span className="session-repeat">{t("train.session.repeat")}</span>
        )}
      </div>
      <AppErrorBoundary>
        <div key={view.session.position} data-mode={mode}>
          {mode === "matching" ? (
            // A matching screen covers a whole round, so it answers several words at once.
            <MatchingBoard
              set={set}
              pairs={roundAt(
                view.session.queue.map((queued) => queued.pair),
                view.session.position,
              )}
              rng={rng}
              onComplete={(results) => {
                giveFeedback(results.values());
                answerRound(results);
              }}
            />
          ) : (
            renderCard({
              card,
              set,
              direction: view.direction,
              terms,
              pool,
              rng,
              onAnswer: (result) => {
                giveFeedback(result);
                answer(result);
              },
            })
          )}
        </div>
      </AppErrorBoundary>
    </div>
  );
}

/**
 * Shared shell of all training modes: start panel, running session with a
 * progress bar and quit, and the end screen (FR-TRN-*). Renders only the title
 * until the active set is known; `TrainGate` handles the missing-set cases.
 */
export function TrainSession(props: TrainSessionProps) {
  const { t } = useI18n();
  const { activeSet } = useActiveSet();

  if (activeSet === null) {
    return <h1 tabIndex={-1}>{t(props.title)}</h1>;
  }
  return <ActiveSession key={activeSet.id} set={activeSet} {...props} />;
}
