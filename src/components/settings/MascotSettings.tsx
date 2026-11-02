import { MASCOT_IDS } from "../../core/mascots";
import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";
import { MASCOT_IMAGES } from "../common/mascotImages";

/** Mascot picker with a preview of each mascot, plus the switch for talk bubbles (NH-12). */
export function MascotSettings() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();

  return (
    <section aria-labelledby="settings-mascot-heading">
      <h2 id="settings-mascot-heading">{t("settings.mascot.heading")}</h2>
      <fieldset className="mascot-picker">
        <legend>{t("settings.mascot.choose")}</legend>
        <div className="mascot-options">
          {MASCOT_IDS.map((id) => (
            <label key={id} className="mascot-option card">
              <input
                type="radio"
                name="mascot"
                value={id}
                checked={settings.mascot === id}
                onChange={() => {
                  updateSettings({ mascot: id });
                }}
              />
              <img
                className="mascot-option-image"
                src={MASCOT_IMAGES[id]}
                alt=""
              />
              <span className="mascot-option-name">
                {t(`mascot.name.${id}`)}
              </span>
              <span className="mascot-option-species">
                {t(`mascot.species.${id}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="check-field">
        <input
          type="checkbox"
          checked={settings.mascotTalk}
          onChange={(event) => {
            updateSettings({ mascotTalk: event.target.checked });
          }}
        />
        {t("settings.mascot.talk")}
      </label>
    </section>
  );
}
