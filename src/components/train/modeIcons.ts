import type { TrainMode } from "../../router";

/** Decorative emoji per training mode (NH-8); always rendered inside an `aria-hidden` element. */
export const MODE_ICONS: Readonly<Record<TrainMode, string>> = {
  flashcards: "🃏",
  writing: "✏️",
  quiz: "❓",
  matching: "🧩",
  hangman: "🔤",
};
