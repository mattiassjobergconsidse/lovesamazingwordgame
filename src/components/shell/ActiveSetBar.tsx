import { useState } from "react";
import { useActiveSet } from "../../hooks/useActiveSet";
import "../common/common.css";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import { SetPickerDialog } from "../sets/SetPickerDialog";

/** Always-visible bar with the active set, its word count and a way to change it (FR-ACT-2). */
export function ActiveSetBar() {
  const { t, tp } = useI18n();
  const { activeSet, wordCount } = useActiveSet();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section aria-label={t("activeSet.label")} className="active-set-bar">
      {activeSet === null ? (
        <span>{t("activeSet.none")}</span>
      ) : (
        <span>
          <a
            href={routeToHash({ name: "setEditor", id: activeSet.id })}
            className="active-set-name"
          >
            {activeSet.name}
          </a>
          {" · "}
          {tp("wordCount", wordCount)}
        </span>
      )}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => {
          setPickerOpen(true);
        }}
      >
        {activeSet === null ? t("activeSet.choose") : t("activeSet.change")}
      </button>
      {pickerOpen && (
        <SetPickerDialog
          onClose={() => {
            setPickerOpen(false);
          }}
        />
      )}
    </section>
  );
}
