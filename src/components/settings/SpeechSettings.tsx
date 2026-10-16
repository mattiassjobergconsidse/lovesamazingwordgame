import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";
import { isSpeechSupported } from "../../storage/speech";

/** Settings switch for reading each word aloud automatically (NH-2). Hidden when speech is unsupported. */
export function SpeechSettings() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();

  if (!isSpeechSupported()) {
    return null;
  }

  return (
    <section aria-labelledby="settings-speech-heading">
      <h2 id="settings-speech-heading">{t("settings.speech.heading")}</h2>
      <label className="check-field">
        <input
          type="checkbox"
          checked={settings.speechEnabled}
          onChange={(event) => {
            updateSettings({ speechEnabled: event.target.checked });
          }}
        />
        {t("settings.speech.autoPlay")}
      </label>
      <p>{t("settings.speech.hint")}</p>
    </section>
  );
}
