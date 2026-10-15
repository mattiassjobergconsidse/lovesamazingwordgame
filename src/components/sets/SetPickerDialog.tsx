import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import { useActiveSet } from "../../hooks/useActiveSet";
import { useLibrary } from "../../hooks/useLibrary";
import { Dialog } from "../common/Dialog";

interface SetPickerDialogProps {
  /** Called after a set was chosen and when the user dismisses the dialog. */
  readonly onClose: () => void;
}

/** Lets the user choose the active set from anywhere (FR-ACT-1, FR-ACT-2). */
export function SetPickerDialog({ onClose }: SetPickerDialogProps) {
  const { t, tp, language } = useI18n();
  const { sets, pairs } = useLibrary();
  const { activeSet, setActiveSetId } = useActiveSet();
  const sorted = [...sets].sort((left, right) =>
    left.name.localeCompare(right.name, language),
  );

  return (
    <Dialog title={t("picker.title")} onClose={onClose}>
      {sorted.length === 0 ? (
        <>
          <p>{t("picker.empty")}</p>
          <a
            className="button button-link"
            href={routeToHash({ name: "sets" })}
            onClick={onClose}
          >
            {t("picker.create")}
          </a>
        </>
      ) : (
        <>
          <p>{t("picker.body")}</p>
          <ul className="picker-list">
            {sorted.map((set) => (
              <li key={set.id}>
                <button
                  type="button"
                  className="button button-secondary picker-option"
                  aria-pressed={set.id === activeSet?.id}
                  onClick={() => {
                    setActiveSetId(set.id);
                    onClose();
                  }}
                >
                  <span>{set.name}</span>
                  <span className="picker-meta">
                    {tp(
                      "wordCount",
                      pairs.filter((pair) => pair.setId === set.id).length,
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          {t("common.cancel")}
        </button>
      </div>
    </Dialog>
  );
}
