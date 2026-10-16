import { useId } from "react";
import { useVoiceLanguages } from "../../hooks/useVoiceLanguages";
import { useI18n } from "../../i18n";
import { isSpeechSupported } from "../../storage/speech";
import type { WordSet } from "../../types";

interface SpeechLanguageFieldsProps {
  readonly set: WordSet;
  readonly onChange: (codes: {
    readonly langACode: string | null;
    readonly langBCode: string | null;
  }) => void;
}

interface VoiceSelectProps {
  readonly label: string;
  readonly value: string | undefined;
  readonly voices: readonly string[];
  readonly onChange: (value: string | null) => void;
}

function VoiceSelect({ label, value, voices, onChange }: VoiceSelectProps) {
  const { t } = useI18n();
  const id = useId();
  // A saved tag stays selectable even if this device has no matching voice.
  const options =
    value === undefined || voices.includes(value) ? voices : [value, ...voices];

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        className="text-input"
        value={value ?? ""}
        onChange={(event) => {
          onChange(event.target.value === "" ? null : event.target.value);
        }}
      >
        <option value="">{t("editor.voice.none")}</option>
        {options.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Voice language pickers for both sides of a set (NH-2). Not rendered when the
 * browser cannot speak.
 */
export function SpeechLanguageFields({
  set,
  onChange,
}: SpeechLanguageFieldsProps) {
  const { t } = useI18n();
  const voices = useVoiceLanguages();

  if (!isSpeechSupported()) {
    return null;
  }

  return (
    <section aria-labelledby="editor-voice-heading" className="set-form">
      <h2 id="editor-voice-heading">{t("editor.voice.heading")}</h2>
      <VoiceSelect
        label={t("editor.voice.field", { lang: set.langA })}
        value={set.langACode}
        voices={voices}
        onChange={(langACode) => {
          onChange({ langACode, langBCode: set.langBCode ?? null });
        }}
      />
      <VoiceSelect
        label={t("editor.voice.field", { lang: set.langB })}
        value={set.langBCode}
        voices={voices}
        onChange={(langBCode) => {
          onChange({ langACode: set.langACode ?? null, langBCode });
        }}
      />
    </section>
  );
}
