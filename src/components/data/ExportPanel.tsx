import { useState } from "react";
import { useDataExchange } from "../../hooks/useDataExchange";
import { useToast } from "../../hooks/useToast";
import { useI18n } from "../../i18n";
import "../common/common.css";
import "./data.css";

interface ExportPanelProps {
  /** Export only this set (JSON and CSV); without it, all data is exported as JSON. */
  readonly setId?: string;
}

/** Buttons that download a set or all data as JSON or CSV (FR-IO-1, FR-IO-3). */
export function ExportPanel({ setId }: ExportPanelProps) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { ready, exportSet, exportAll, exportCsv } = useDataExchange();
  const [includeProgress, setIncludeProgress] = useState(true);
  const headingId = setId === undefined ? "export-all" : "export-set";

  const report = (downloaded: boolean) => {
    if (!downloaded) {
      showToast({ message: t("data.export.failed") });
    }
  };

  return (
    <section aria-labelledby={headingId} className="data-panel">
      <h2 id={headingId}>{t("data.export.heading")}</h2>
      <label className="check-field">
        <input
          type="checkbox"
          checked={includeProgress}
          onChange={(event) => {
            setIncludeProgress(event.target.checked);
          }}
        />
        {t("data.export.includeProgress")}
      </label>
      <div className="data-actions">
        {setId === undefined ? (
          <button
            type="button"
            className="button"
            disabled={!ready}
            onClick={() => {
              report(exportAll(includeProgress));
            }}
          >
            {t("data.export.all")}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="button"
              disabled={!ready}
              onClick={() => {
                report(exportSet(setId, includeProgress));
              }}
            >
              {t("data.export.json")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={!ready}
              onClick={() => {
                report(exportCsv(setId));
              }}
            >
              {t("data.export.csv")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}