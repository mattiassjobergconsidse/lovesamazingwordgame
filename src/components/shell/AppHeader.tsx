import { useI18n, type MessageKey } from "../../i18n";
import { routeToHash, useRoute, type Route } from "../../router";
import { LanguageSwitch } from "../common/LanguageSwitch";
import { ThemeToggle } from "../common/ThemeToggle";
import { ShortcutHelp } from "./ShortcutHelp";

interface NavItem {
  readonly route: Route;
  readonly label: MessageKey;
  /** Route names that mark this item as current. */
  readonly matches: readonly Route["name"][];
}

const NAV_ITEMS: readonly NavItem[] = [
  { route: { name: "home" }, label: "nav.home", matches: ["home"] },
  {
    route: { name: "sets" },
    label: "nav.sets",
    matches: ["sets", "setEditor"],
  },
  {
    route: { name: "train" },
    label: "nav.train",
    matches: ["train", "trainMode"],
  },
  { route: { name: "stats" }, label: "nav.stats", matches: ["stats"] },
  {
    route: { name: "settings" },
    label: "nav.settings",
    matches: ["settings"],
  },
];

/** App title, main navigation, language switch and theme toggle. */
export function AppHeader() {
  const { t } = useI18n();
  const current = useRoute();

  return (
    <header className="app-header">
      <p className="app-title">{t("app.title")}</p>
      <nav aria-label={t("nav.label")} className="app-nav">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.route.name}>
              <a
                href={routeToHash(item.route)}
                aria-current={
                  item.matches.includes(current.name) ? "page" : undefined
                }
              >
                {t(item.label)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="app-header-actions">
        <LanguageSwitch />
        <ThemeToggle />
        <ShortcutHelp />
      </div>
    </header>
  );
}
