import { useId, useState } from "react";
import { useDataExchange } from "../../hooks/useDataExchange";
import { useToast } from "../../hooks/useToast";
import { useI18n } from "../../i18n";
import { Dialog } from "../common/Dialog";
import "../common/common.css";
import "./data.css";

/** Deletes all data after the user types the confirmation word (FR-IO-4). */
export function ResetPanel() {
  const { t } = useI18n();
  const { ready, resetAll } = useDataExchange();
  const { showToast } = useToast();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const word = t("data.reset.word");

  function close() {
    setOpen(false);
    setTyped("");
  }

  async function confirm() {
    const done = await resetAll();
    close();
    if (done) {
      showToast({ message: t("data.reset.done") });
    }
  }

  return (
    <section aria-labelledby={`${inputId}-heading`} className="data-panel">
      <h2 id={`${inputId}-heading`}>{t("data.reset.heading")}</h2>
      <p>{t("data.reset.body")}</p>
      <div className="data-actions">
        <button
          type="button"
          className="button button-danger"
          disabled={!ready}
          onClick={() => {
            setOpen(true);
          }}
        >
          {t("data.reset.open")}
        </button>
      </div>
      {open && (
        <Dialog title={t("data.reset.title")} onClose={close}>
          <div className="field">
            <label htmlFor={inputId} className="field-label">
              {t("data.reset.prompt", { word })}
            </label>
            <input
              id={inputId}
              className="text-input"
              value={typed}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
            />
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-danger"
              disabled={typed.trim() !== word}
              onClick={() => {
                void confirm();
              }}
            >
              {t("data.reset.confirm")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={close}
            >
              {t("common.cancel")}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
