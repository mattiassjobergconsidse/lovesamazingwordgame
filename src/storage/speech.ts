/** Thin wrapper around the Web Speech API (`speechSynthesis`), NH-2. Nothing leaves the device. */

function getSynthesis(): SpeechSynthesis | null {
  return typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
    ? window.speechSynthesis
    : null;
}

/** Whether the browser can read text aloud. */
export function isSpeechSupported(): boolean {
  return getSynthesis() !== null;
}

/** Some platforms report tags like "sv_SE"; BCP-47 uses a hyphen. */
function normalizeTag(tag: string): string {
  return tag.replace("_", "-");
}

/**
 * Lists the languages the installed voices can speak.
 *
 * @returns Distinct BCP-47 tags, sorted; empty when unsupported or when voices have not loaded yet.
 */
export function listVoiceLanguages(
  synthesis: SpeechSynthesis | null = getSynthesis(),
): readonly string[] {
  if (synthesis === null) {
    return [];
  }
  const tags = new Set(
    synthesis.getVoices().map((voice) => normalizeTag(voice.lang)),
  );
  return [...tags].sort((left, right) => left.localeCompare(right));
}

/**
 * Calls `listener` when the list of voices changes (browsers load voices lazily).
 *
 * @returns A function that removes the listener.
 */
export function onVoicesChanged(
  listener: () => void,
  synthesis: SpeechSynthesis | null = getSynthesis(),
): () => void {
  if (synthesis === null) {
    return () => undefined;
  }
  synthesis.addEventListener("voiceschanged", listener);
  return () => {
    synthesis.removeEventListener("voiceschanged", listener);
  };
}

// Chrome can garbage-collect an utterance that nothing references and drop its speech.
let current: SpeechSynthesisUtterance | null = null;

/** Reads `text` aloud in `lang`, replacing anything still being spoken. Does nothing when unsupported. */
export function speak(
  text: string,
  lang: string,
  synthesis: SpeechSynthesis | null = getSynthesis(),
): void {
  if (synthesis === null) {
    return;
  }
  try {
    synthesis.cancel();
    if (current !== null) {
      current.onend = null;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    current = utterance;
    synthesis.speak(utterance);
  } catch {
    // Speech is optional: a failing speech engine must never break a card.
  }
}

/**
 * Like {@link speak}, but calls `onDone` once the text has been spoken, or when it
 * could not be (unsupported, engine error, speech cancelled). Called at most once.
 */
export function speakThen(
  text: string,
  lang: string,
  onDone: () => void,
  synthesis: SpeechSynthesis | null = getSynthesis(),
): void {
  if (synthesis === null) {
    onDone();
    return;
  }
  let called = false;
  const done = () => {
    if (!called) {
      called = true;
      onDone();
    }
  };
  try {
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onend = done;
    utterance.onerror = done;
    synthesis.speak(utterance);
  } catch {
    done();
  }
}

/** Stops any speech in progress. */
export function stopSpeaking(
  synthesis: SpeechSynthesis | null = getSynthesis(),
): void {
  synthesis?.cancel();
}
