/** Short answer sounds (WebAudio) and vibration (`navigator.vibrate`), NH-4. Nothing leaves the device. */
import { TONES, VIBRATIONS } from "../core/feedback";
import type { AnswerResult } from "../types";

/** The slice of `navigator` that vibration needs; injectable for tests. */
export interface VibrationTarget {
  readonly vibrate?: (pattern: number | number[]) => boolean;
}

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") {
    return null;
  }
  sharedContext ??= new AudioContext();
  return sharedContext;
}

/** Whether the browser can play generated sounds. */
export function isSoundSupported(): boolean {
  return typeof window !== "undefined" && typeof AudioContext !== "undefined";
}

/** Whether the device can vibrate. */
export function isHapticsSupported(
  target: VibrationTarget = navigator,
): boolean {
  return typeof target.vibrate === "function";
}

/**
 * Plays the tone for an answer. Does nothing when sound is unsupported or blocked.
 *
 * @param result How the answer went.
 * @param context The audio context to use; defaults to a shared one.
 */
export function playAnswerSound(
  result: AnswerResult,
  context: AudioContext | null = getAudioContext(),
): void {
  if (context === null) {
    return;
  }
  try {
    if (context.state === "suspended") {
      void context.resume();
    }
    const { frequency, duration } = TONES[result];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    // A quick fade-out avoids a click at the end of the tone.
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  } catch {
    // Feedback is a nicety; a failing audio device must never disturb training.
  }
}

/**
 * Vibrates with the pattern for an answer. Does nothing when unsupported.
 *
 * @param result How the answer went.
 * @param target Where to call `vibrate`; defaults to `navigator`.
 */
export function vibrateForAnswer(
  result: AnswerResult,
  target: VibrationTarget = navigator,
): void {
  try {
    target.vibrate?.([...VIBRATIONS[result]]);
  } catch {
    // Ignored on purpose, see above.
  }
}
