import { createContext } from "react";
import type { BulkParsedPair } from "../core/bulkParse";
import type { SetFieldErrors, SetFields } from "../core/setValidation";
import type { SessionEndEvent } from "../core/trophies";
import type { TrophyId, TrophyRecord } from "../core/trophyDefinitions";
import type {
  AnswerResult,
  DailyActivity,
  WordPair,
  WordProgress,
  WordSet,
} from "../types";

/** Result of creating or editing a set: validation problems are data, not exceptions. */
export type SetResult =
  | { readonly ok: true; readonly set: WordSet }
  | { readonly ok: false; readonly errors: SetFieldErrors };

/** Raw text of one word pair row; `;` separates alternatives (FR-SET-7). */
export interface PairInput {
  readonly a: string;
  readonly b: string;
}

/** What is needed to put a removed pair back (FR-SET-6 Undo). */
export interface RemovedPair {
  readonly pair: WordPair;
  readonly progress: WordProgress | null;
}

/** All sets and pairs, held in memory and written through to storage. */
export interface Library {
  /** `loading` until the first read from storage has finished. */
  readonly status: "loading" | "ready";
  readonly sets: readonly WordSet[];
  readonly pairs: readonly WordPair[];
  readonly progress: readonly WordProgress[];
  readonly activity: readonly DailyActivity[];
  /** Unlocked trophies (NH-10). */
  readonly trophies: readonly TrophyRecord[];
  /**
   * Re-reads everything from storage after a bulk change made outside the
   * store (import, reset).
   *
   * @throws If reading fails.
   */
  readonly reload: () => Promise<void>;
  readonly createSet: (fields: SetFields) => SetResult;
  readonly updateSet: (id: string, fields: SetFields) => SetResult;
  /** Sets the voice language tags used for pronunciation (NH-2); `null` removes a tag. */
  readonly updateSpeechLanguages: (
    id: string,
    codes: {
      readonly langACode: string | null;
      readonly langBCode: string | null;
    },
  ) => void;
  /** Copies a set without progress; `baseName` is made unique. Returns `null` for an unknown id. */
  readonly duplicateSet: (id: string, baseName: string) => WordSet | null;
  /** Deletes a set with all its data; clears the active set if it was the one deleted. */
  readonly deleteSet: (id: string) => void;
  /** Adds one pair; returns `null` when a term is empty. */
  readonly addPair: (setId: string, input: PairInput) => WordPair | null;
  /** Adds many pairs at once (bulk add). */
  readonly addParsedPairs: (
    setId: string,
    parsed: readonly BulkParsedPair[],
  ) => readonly WordPair[];
  /** Changes a pair's text, keeping its progress; returns `false` when a term is empty or the id is unknown. */
  readonly updatePair: (pairId: string, input: PairInput) => boolean;
  /** Removes a pair; returns what Undo needs, or `null` for an unknown id. */
  readonly removePair: (pairId: string) => RemovedPair | null;
  readonly restorePair: (removed: RemovedPair) => void;
  /**
   * Applies the first answer to a word to its progress and the daily activity,
   * and writes both through right away (FR-TRN-4).
   */
  readonly recordAnswer: (
    pair: WordPair,
    result: AnswerResult,
    now: number,
  ) => void;
  /**
   * Evaluates the trophy rules for a session that just ended, using the
   * latest progress and activity, and stores new unlocks right away (NH-10).
   *
   * @returns Ids of the trophies unlocked now; empty when there are none.
   */
  readonly completeSession: (
    event: SessionEndEvent,
    now: number,
  ) => readonly TrophyId[];
}

export const LibraryContext = createContext<Library | null>(null);
