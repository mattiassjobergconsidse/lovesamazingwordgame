/** Wrong guesses allowed before a Hangman round is lost (NH-9). */
export const MAX_WRONG_GUESSES = 6;

/** Letters offered on the on-screen keyboard; answers may add more (see {@link keyboardLetters}). */
const BASE_LETTERS: readonly string[] = Array.from(
  "abcdefghijklmnopqrstuvwxyzåäö",
);

/** State of one Hangman round. Immutable: every guess returns a new state. */
export interface HangmanState {
  /** The word to guess, NFC normalised, original casing kept for display. */
  readonly answer: string;
  /** Distinct lower-case letters guessed so far, in guess order. */
  readonly guessed: readonly string[];
}

/** Whether a round is still running. */
export type HangmanStatus = "playing" | "won" | "lost";

/** One character of the answer as shown to the player. */
export interface HangmanSlot {
  readonly char: string;
  /** False for spaces, hyphens, digits and punctuation, which are never hidden. */
  readonly isLetter: boolean;
  readonly revealed: boolean;
}

const LETTER = /^\p{L}$/u;

/** Normalises a single typed character for comparison; accents stay distinct (`ä` is not `a`). */
function normalizeLetter(char: string): string {
  return char.normalize("NFC").toLowerCase();
}

/** Whether `char` is a single letter that can be guessed. */
export function isGuessableLetter(char: string): boolean {
  return LETTER.test(char);
}

function answerLetters(answer: string): Set<string> {
  return new Set(
    Array.from(answer)
      .filter((char) => LETTER.test(char))
      .map(normalizeLetter),
  );
}

/**
 * Starts a round for `answer`.
 *
 * @param answer The word or phrase to guess.
 */
export function createHangman(answer: string): HangmanState {
  return { answer: answer.normalize("NFC").trim(), guessed: [] };
}

/**
 * Letters guessed that do not occur in the answer.
 *
 * @param state The round.
 */
export function wrongGuesses(state: HangmanState): string[] {
  const letters = answerLetters(state.answer);
  return state.guessed.filter((letter) => !letters.has(letter));
}

/**
 * Current status: won when every letter is revealed, lost when the wrong guesses reach the limit.
 * An answer without letters (for example "42") is won immediately.
 *
 * @param state The round.
 */
export function hangmanStatus(state: HangmanState): HangmanStatus {
  const letters = answerLetters(state.answer);
  if ([...letters].every((letter) => state.guessed.includes(letter))) {
    return "won";
  }
  return wrongGuesses(state).length >= MAX_WRONG_GUESSES ? "lost" : "playing";
}

/**
 * Applies a guess. Non-letters, repeated letters and guesses after the round ended
 * are ignored and return the same state, so a repeated key press never costs a life.
 *
 * @param state The round.
 * @param char The typed character, any case.
 */
export function guessLetter(state: HangmanState, char: string): HangmanState {
  if (!isGuessableLetter(char) || hangmanStatus(state) !== "playing") {
    return state;
  }
  const letter = normalizeLetter(char);
  if (state.guessed.includes(letter)) {
    return state;
  }
  return { ...state, guessed: [...state.guessed, letter] };
}

/**
 * The answer as slots for display; hidden letters have `revealed: false`.
 *
 * @param state The round.
 * @param revealAll Reveal everything, used after the round is lost.
 */
export function answerSlots(
  state: HangmanState,
  revealAll = false,
): HangmanSlot[] {
  return Array.from(state.answer).map((char) => {
    const isLetter = LETTER.test(char);
    return {
      char,
      isLetter,
      revealed:
        !isLetter || revealAll || state.guessed.includes(normalizeLetter(char)),
    };
  });
}

/**
 * Letters for the on-screen keyboard: a-z, å, ä, ö, plus any other letter the answer
 * contains (for example `é`), so every answer can be solved.
 *
 * @param answer The word being guessed.
 */
export function keyboardLetters(answer: string): string[] {
  const extra = [...answerLetters(answer)]
    .filter((letter) => !BASE_LETTERS.includes(letter))
    .sort((x, y) => x.localeCompare(y));
  return [...BASE_LETTERS, ...extra];
}
