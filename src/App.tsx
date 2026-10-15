import type { MouseEvent } from "react";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import { SettingsProvider } from "./components/common/SettingsProvider";
import { ActiveSetBar } from "./components/shell/ActiveSetBar";
import { AppHeader } from "./components/shell/AppHeader";
import { RouteOutlet } from "./components/shell/RouteOutlet";
import { StorageBanner } from "./components/shell/StorageBanner";
import { useDocumentPreferences } from "./hooks/useDocumentPreferences";
import { useSettings } from "./hooks/useSettings";
import { I18nProvider, useI18n } from "./i18n";
import "./App.css";

/** A hash link to `#main` would be read by the router as a route change, so focus the element instead. */
function focusMain(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  document.getElementById("main")?.focus();
}

function Shell() {
  const { t } = useI18n();
  const { storageError } = useSettings();

  return (
    <>
      <a href="#main" className="skip-link" onClick={focusMain}>
        {t("a11y.skipToContent")}
      </a>
      <AppHeader />
      <ActiveSetBar />
      {storageError !== null && <StorageBanner error={storageError} />}
      <AppErrorBoundary>
        <RouteOutlet />
      </AppErrorBoundary>
    </>
  );
}

function LocalizedShell() {
  const { settings } = useSettings();
  useDocumentPreferences(settings);

  return (
    <I18nProvider language={settings.uiLanguage}>
      <Shell />
    </I18nProvider>
  );
}

/** Application root: settings, translations, shell and error handling. */
export function App() {
  return (
    <SettingsProvider>
      <LocalizedShell />
    </SettingsProvider>
  );
}
