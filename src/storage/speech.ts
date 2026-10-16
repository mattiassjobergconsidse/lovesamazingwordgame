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

/** Reads `text` aloud in `lang`, replacing anything still being spoken. Does nothing when unsupported. */
export function speak(
  text: string,
  lang: string,
  synthesis: SpeechSynthesis | null = getSynthesis(),
): void {
  if (synthesis === null) {
    return;
  }
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  synthesis.speak(utterance);
}

/** Stops any speech in progress. */
export function stopSpeaking(
  synthesis: SpeechSynthesis | null = getSynthesis(),
): void {
  synthesis?.cancel();
}
