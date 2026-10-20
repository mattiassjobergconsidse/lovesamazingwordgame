import { useI18n } from "../../i18n";
import { ExportPanel } from "../data/ExportPanel";
import { ImportPanel } from "../data/ImportPanel";
import { ResetPanel } from "../data/ResetPanel";
import { FeedbackSettings } from "./FeedbackSettings";
import { GoalSettings } from "./GoalSettings";
import { SpeechSettings } from "./SpeechSettings";
import { ThemeSelector } from "./ThemeSelector";
import "./settings.css";

/**
 * `#/settings`: backup, restore and reset of all data (FR-IO-1, FR-IO-2, FR-IO-4).
 * The preference controls of FR-SETT-1 are not part of this screen yet.
 */
export function SettingsScreen() {
  const { t } = useI18n();

  return (
    <div className="settings-screen">
      <h1 tabIndex={-1}>{t("nav.settings")}</h1>
      <ThemeSelector />
      <GoalSettings />
      <SpeechSettings />
      <FeedbackSettings />
      <h2>{t("data.heading")}</h2>
      <ExportPanel />
      <ImportPanel />
      <ResetPanel />
    </div>
  );
}
