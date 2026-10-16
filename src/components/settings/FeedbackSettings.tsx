import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";
import { isHapticsSupported, isSoundSupported } from "../../storage/feedback";

/** Settings switches for answer sounds and vibration (NH-4). Each is hidden when unsupported. */
export function FeedbackSettings() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const sound = isSoundSupported();
  const haptics = isHapticsSupported();

  if (!sound && !haptics) {
    return null;
  }

  return (
    <section aria-labelledby="settings-feedback-heading">
      <h2 id="settings-feedback-heading">{t("settings.feedback.heading")}</h2>
      {sound && (
        <label className="check-field">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(event) => {
              updateSettings({ soundEnabled: event.target.checked });
            }}
          />
          {t("settings.feedback.sound")}
        </label>
      )}
      {haptics && (
        <label className="check-field">
          <input
            type="checkbox"
            checked={settings.hapticsEnabled}
            onChange={(event) => {
              updateSettings({ hapticsEnabled: event.target.checked });
            }}
          />
          {t("settings.feedback.haptics")}
        </label>
      )}
    </section>
  );
}
