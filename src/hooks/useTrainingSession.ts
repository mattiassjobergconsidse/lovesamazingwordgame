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
import { hardestWords, lastSessionMistakes } from "../core/stats";
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
      /** Wrong verdicts the user overrode with "I was right" (NH-11). */
      readonly overrides: number;
    }
  | {
      readonly status: "finished";
      readonly session: SessionState;
      readonly durationMs: number;
      readonly overrides: number;
    };

/** Extra facts about an answer that do not change its result. */
export interface AnswerOptions {
  /** The user overrode a wrong verdict, so the session is not unaided (NH-11). */
  readonly overridden?: boolean;
}

/** Injectable time and randomness, so the session is deterministic in tests. */
export interface TrainingEnvironment {
  readonly now: () => number;
  readonly rng: Rng;
}

const DEFAULT_ENVIRONMENT: TrainingEnvironment = {
  now: () => Date.now(),
  rng: () => Math.random(),
};

/**
 * Which words a session draws from: the whole set, its hardest words (FR-ST-2)
 * or the mistakes of the last session (NH-15).
 */
export type TrainingFocus = "all" | "hardest" | "mistakes";
/** Extra rules of a session that only some modes use. */
export interface TrainingOptions {
  /** A wrong word comes back until it is solved, as in the Boss Battle (NH-15). */
  readonly retryUntilCorrect?: boolean;
  /** At most this many words, e.g. so a boss stays beatable. */
  readonly maxWords?: number;
}

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
  readonly answer: (result: AnswerResult, options?: AnswerOptions) => void;
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
 * @param focus Limits sessions to the set's hardest words or last-session mistakes.
 * @param options Extra rules such as retrying wrong words.
 * @throws If used outside the settings and library providers.
 */
export function useTrainingSession(
  setId: string,
  environment: TrainingEnvironment = DEFAULT_ENVIRONMENT,
  focus: TrainingFocus = "all",
  options: TrainingOptions = {},
): TrainingSession {
  const { retryUntilCorrect = false, maxWords } = options;
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
  const sessionPairs = useMemo(() => {
    const focused =
      focus === "hardest"
        ? hardestWords(setPairs, progress).map((hard) => hard.pair)
        : focus === "mistakes"
          ? lastSessionMistakes(setPairs, progress)
          : setPairs;
    return maxWords === undefined ? focused : focused.slice(0, maxWords);
  }, [focus, maxWords, setPairs, progress]);
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
        session: startSession(queue, { retryUntilCorrect }),
        direction: pickDirection(directionMode, rng),
        startedAt: now(),
        overrides: 0,
      });
    },
    [directionMode, now, rng, retryUntilCorrect],
  );

  const start = useCallback(() => {
    begin(
      buildSessionQueue(sessionPairs, progressByPair, {
        size: sessionSize,
        now: now(),
        rng,
      }),
    );
  }, [begin, sessionPairs, progressByPair, sessionSize, now, rng]);

  const practiseMistakes = useCallback(() => {
    if (view.status === "finished") {
      begin(mistakePairs(view.session));
    }
  }, [begin, view]);

  const answer = useCallback(
    (result: AnswerResult, options: AnswerOptions = {}) => {
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
      const overrides = view.overrides + (options.overridden === true ? 1 : 0);
      setView(
        isFinished(next)
          ? {
              status: "finished",
              session: next,
              durationMs: timestamp - view.startedAt,
              overrides,
            }
          : {
              ...view,
              session: next,
              direction: pickDirection(directionMode, rng),
              overrides,
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
              overrides: view.overrides,
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
        ? sessionPairs.length
        : Math.min(sessionSize, sessionPairs.length),
    extraPractice:
      focus === "all" && isExtraPractice(setPairs, progressByPair, openedAt),
    card: view.status === "running" ? currentCard(view.session) : null,
    pool: setPairs,
    rng,
    start,
    practiseMistakes,
    answer,
    answerRound,
  };
}
