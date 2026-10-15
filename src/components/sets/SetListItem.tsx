import type { SetSummary } from "../../core/setSummary";
import "../common/common.css";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import type { WordSet } from "../../types";

interface SetListItemProps {
  readonly set: WordSet;
  readonly summary: SetSummary;
  readonly isActive: boolean;
  readonly onUse: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

/** One row of the set list (FR-SET-5) with its actions. */
export function SetListItem({
  set,
  summary,
  isActive,
  onUse,
  onDuplicate,
  onDelete,
}: SetListItemProps) {
  const { t, tp, language } = useI18n();
  const lastPractised =
    summary.lastPractisedAt === null
      ? t("sets.item.neverPractised")
      : t("sets.item.lastPractised", {
          date: new Intl.DateTimeFormat(language, {
            dateStyle: "medium",
          }).format(summary.lastPractisedAt),
        });

  return (
    <li className="set-item">
      <div className="set-item-info">
        <h2 className="set-item-name">
          <a href={routeToHash({ name: "setEditor", id: set.id })}>
            <span className="visually-hidden">
              {t("sets.action.edit", { name: set.name })}
            </span>
            <span aria-hidden="true">{set.name}</span>
          </a>
          {isActive && <span className="badge">{t("sets.item.active")}</span>}
        </h2>
        <p className="set-item-meta">
          {t("sets.item.languages", { langA: set.langA, langB: set.langB })}
          {" · "}
          {tp("wordCount", summary.wordCount)}
          {" · "}
          {tp("dueCount", summary.dueCount)}
          {" · "}
          {lastPractised}
        </p>
      </div>
      <div className="set-item-actions">
        {!isActive && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onUse}
          >
            {t("sets.action.use", { name: set.name })}
          </button>
        )}
        <button
          type="button"
          className="button button-secondary"
          onClick={onDuplicate}
        >
          {t("sets.action.duplicate", { name: set.name })}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={onDelete}
        >
          {t("sets.action.delete", { name: set.name })}
        </button>
      </div>
    </li>
  );
}
