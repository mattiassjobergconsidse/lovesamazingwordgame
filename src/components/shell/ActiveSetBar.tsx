import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";

/** Always-visible bar showing the active set. Real set data arrives in phase P1. */
export function ActiveSetBar() {
  const { t } = useI18n();

  return (
    <section aria-label={t("activeSet.label")} className="active-set-bar">
      <span>{t("activeSet.none")}</span>
      <a href={routeToHash({ name: "sets" })}>{t("activeSet.choose")}</a>
    </section>
  );
}
