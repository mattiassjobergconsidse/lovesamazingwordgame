import { useCallback, useMemo, useState } from "react";
import { pickDirection } from "../core/direction";
import {
  answerCard,
  answerRound as answerSessionRound,
  buildSessionQueue,
  currentCard,
  isExtraPractice,
  isFinished,
  mistakePairs,
  startSession,
  type SessionCard,
  type SessionState,
} from "../core/session";
import type { Rng } from "../core/shuffle";
import type { AnswerResult, Direction, WordPair, WordProgress } from "../types";
import { useLibrary } from "./useLibrary";
import { useSettings } from "./useSettings";

/** What the training screen shows: the start panel, a running session or its result. */
export type TrainingView =
  | { readonly status: "idle" }
  | {
      readonly status: "running";
      readonly session: SessionState;
      /** Direction of the current card, chosen once per card (FR-TRN-3). */
      readonly direction: Direction;
      readonly startedAt: number;
    }
  | {
      readonly status: "finished";
      readonly session: SessionState;
      readonly durationMs: number;
    };

/** Injectable time and randomness, so the session is deterministic in tests. */
export interface TrainingEnvironment {
  readonly now: () => number;
  readonly rng: Rng;
}

const DEFAULT_ENVIRONMENT: TrainingEnvironment = {
  now: () => Date.now(),
  rng: () => Math.random(),
};

/** State and actions of one training session of the active set. */
export interface TrainingSession {
  readonly view: TrainingView;
  /** Number of words the next session will contain (FR-TRN-1, FR-TRN-2). */
  readonly plannedCount: number;
  /** True when no word is due or new, so the session is "practise anyway" (FR-TRN-9). */
  readonly extraPractice: boolean;
  /** The card to answer now, or `null` when not running. */
  readonly card: SessionCard | null;
  /** All pairs of the set; modes such as Quiz draw distractors from them. */
  readonly pool: readonly WordPair[];
  /** The random source of this session, for modes that shuffle per card. */
  readonly rng: Rng;
  /** Builds a session from the whole set in spaced-repetition order and starts it. */
  readonly start: () => void;
  /** Starts a new session with only the words answered wrongly (FR-TRN-5). */
  readonly practiseMistakes: () => void;
  /**
   * Answers the current card. The first answer to a word updates its progress
   * and is written to storage right away (FR-TRN-4); repeats do not.
   */
  readonly answer: (result: AnswerResult) => void;
  /**
   * Answers every word of a round at once (Matching, FR-MT-3): each first answer
   * updates progress like {@link TrainingSession.answer}, but nothing is re-queued.
   */
  readonly answerRound: (results: ReadonlyMap<string, AnswerResult>) => void;
}

/**
 * Runs training sessions for one set, shared by all four modes (FR-TRN-*).
 *
 * @param setId The set to practise; all of its words take part.
 * @param environment Clock and random source; defaults to the real ones.
 * @throws If used outside the settings and library providers.
 */
export function useTrainingSession(
  setId: string,
  environment: TrainingEnvironment = DEFAULT_ENVIRONMENT,
): TrainingSession {
  const { now, rng } = environment;
  const { pairs, progress, recordAnswer } = useLibrary();
  const { settings } = useSettings();
  const { directionMode, sessionSize } = settings;
  const [view, setView] = useState<TrainingView>({ status: "idle" });
  // Planning for the start panel uses the time the screen opened; the real
  // queue is built with a fresh time when the user presses Start.
  const [openedAt] = useState(now);

  const setPairs = useMemo(
    () => pairs.filter((pair) => pair.setId === setId),
    [pairs, setId],
  );
  const progressByPair = useMemo(
    () =>
      new Map<string, WordProgress>(
        progress.map((record) => [record.pairId, record]),
      ),
    [progress],
  );

  const begin = useCallback(
    (queue: readonly WordPair[]) => {
      setView({
        status: "running",
        session: startSession(queue),
        direction: pickDirection(directionMode, rng),
        startedAt: now(),
      });
    },
    [directionMode, now, rng],
  );

  const start = useCallback(() => {
    begin(
      buildSessionQueue(setPairs, progressByPair, {
        size: sessionSize,
        now: now(),
        rng,
      }),
    );
  }, [begin, setPairs, progressByPair, sessionSize, now, rng]);

  const practiseMistakes = useCallback(() => {
    if (view.status === "finished") {
      begin(mistakePairs(view.session));
    }
  }, [begin, view]);

  const answer = useCallback(
    (result: AnswerResult) => {
      if (view.status !== "running") {
        return;
      }
      const card = currentCard(view.session);
      if (card === null) {
        return;
      }
      const timestamp = now();
      if (!card.isRepeat) {
        recordAnswer(card.pair, result, timestamp);
      }
      const next = answerCard(view.session, result);
      setView(
        isFinished(next)
          ? {
              status: "finished",
              session: next,
              durationMs: timestamp - view.startedAt,
            }
          : {
              ...view,
              session: next,
              direction: pickDirection(directionMode, rng),
            },
      );
    },
    [view, now, rng, recordAnswer, directionMode],
  );

  const answerRound = useCallback(
    (results: ReadonlyMap<string, AnswerResult>) => {
      if (view.status !== "running") {
        return;
      }
      const timestamp = now();
      const { state: next, answered } = answerSessionRound(
        view.session,
        results,
      );
      for (const { card, result } of answered) {
        if (!card.isRepeat) {
          recordAnswer(card.pair, result, timestamp);
        }
      }
      setView(
        isFinished(next)
          ? {
              status: "finished",
              session: next,
              durationMs: timestamp - view.startedAt,
            }
          : {
              ...view,
              session: next,
              direction: pickDirection(directionMode, rng),
            },
      );
    },
    [view, now, rng, recordAnswer, directionMode],
  );
  return {
    view,
    plannedCount:
      sessionSize === "all"
        ? setPairs.length
        : Math.min(sessionSize, setPairs.length),
    extraPractice: isExtraPractice(setPairs, progressByPair, openedAt),
    card: view.status === "running" ? currentCard(view.session) : null,
    pool: setPairs,
    rng,
    start,
    practiseMistakes,
    answer,
    answerRound,
  };
}
