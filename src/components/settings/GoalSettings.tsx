import { useId } from "react";
import { DAILY_GOALS, isDailyGoal } from "../../core/settings";
import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";

/** Choose how many answers a day fill the goal ring on the home screen. */
export function GoalSettings() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <section aria-labelledby="settings-goal-heading">
      <h2 id="settings-goal-heading">{t("settings.goal.heading")}</h2>
      <div className="field">
        <label htmlFor={id} className="field-label">
          {t("settings.goal.label")}
        </label>
        <select
          id={id}
          className="text-input"
          aria-describedby={hintId}
          value={settings.dailyGoal}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (isDailyGoal(value)) {
              updateSettings({ dailyGoal: value });
            }
          }}
        >
          {DAILY_GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {goal}
            </option>
          ))}
        </select>
        <p id={hintId}>{t("settings.goal.hint")}</p>
      </div>
    </section>
  );
}
