import { useState } from "react";
import type { SetBundle } from "../../core/exportFormat";
import { findConflicts } from "../../core/importPlan";
import { useDataExchange } from "../../hooks/useDataExchange";
import { useLibrary } from "../../hooks/useLibrary";
import { useSharedSet } from "../../hooks/useSharedSet";
import { useToast } from "../../hooks/useToast";
import { useI18n } from "../../i18n";
import { navigate } from "../../router";
import "../common/common.css";
import "./data.css";
import { ImportConflictDialog } from "./ImportConflictDialog";

/** `#/share/:payload`: shows a shared set and imports it after confirmation (NH-5). */
export function ShareImportScreen({ payload }: { readonly payload: string }) {
  const { t, tp } = useI18n();
  const { sets } = useLibrary();
  const { ready, commitImport } = useDataExchange();
  const { showToast } = useToast();
  const decoded = useSharedSet(payload);
  const [asking, setAsking] = useState(false);

  async function finish(
    bundle: SetBundle,
    choices: ReadonlyMap<string, "rename" | "replace" | "skip">,
  ) {
    const count = await commitImport([bundle], choices);
    if (count === null) {
      return;
    }
    showToast({
      message:
        count === 0 ? t("data.import.nothing") : tp("data.import.done", count),
    });
    navigate({ name: "sets" });
  }

  const heading = <h1 tabIndex={-1}>{t("route.share")}</h1>;
  if (decoded.status === "loading") {
    return (
      <>
        {heading}
        <p>{t("share.import.loading")}</p>
      </>
    );
  }
  if (decoded.status === "invalid") {
    return (
      <>
        {heading}
        <p role="alert" className="field-error">
          {t("share.import.invalid")}
        </p>
        <a href="#/sets">{t("editor.back")}</a>
      </>
    );
  }

  const { bundle } = decoded;
  const conflicts = findConflicts([bundle], sets);
  return (
    <section className="data-panel">
      {heading}
      <p>{t("share.import.intro")}</p>
      <h2>{bundle.set.name}</h2>
      <p>
        {t("share.import.details", {
          languages: `${bundle.set.langA} – ${bundle.set.langB}`,
          count: bundle.pairs.length,
        })}
      </p>
      <div className="data-actions">
        <button
          type="button"
          className="button"
          disabled={!ready}
          onClick={() => {
            if (conflicts.length > 0) {
              setAsking(true);
            } else {
              void finish(bundle, new Map());
            }
          }}
        >
          {t("share.import.confirm")}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            navigate({ name: "sets" });
          }}
        >
          {t("share.import.decline")}
        </button>
      </div>
      {asking && (
        <ImportConflictDialog
          conflicts={conflicts}
          onCancel={() => {
            setAsking(false);
          }}
          onConfirm={(choices) => {
            setAsking(false);
            void finish(bundle, choices);
          }}
        />
      )}
    </section>
  );
}
