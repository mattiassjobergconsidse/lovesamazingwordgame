import { useState, type SubmitEvent } from "react";
import { summarizeSet } from "../../core/setSummary";
import { validateSetFields, type SetFields } from "../../core/setValidation";
import { useActiveSet } from "../../hooks/useActiveSet";
import { useLibrary } from "../../hooks/useLibrary";
import { useI18n } from "../../i18n";
import { navigate } from "../../router";
import type { WordSet } from "../../types";
import { ImportPanel } from "../data/ImportPanel";
import { DeleteSetDialog } from "./DeleteSetDialog";
import { SetFieldsForm } from "./SetFieldsForm";
import { SetListItem } from "./SetListItem";
import "./sets.css";

/** `#/sets`: create, open, duplicate, delete and choose the active set (FR-SET-1 to FR-SET-5). */
export function SetsScreen() {
  const { t, language } = useI18n();
  const { status, sets, pairs, progress, createSet, duplicateSet, deleteSet } =
    useLibrary();
  const { activeSet, setActiveSetId } = useActiveSet();
  // Time is read once per visit; the list does not need to tick.
  const [now] = useState(() => Date.now());
  const [edits, setEdits] = useState<Partial<SetFields>>({});
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState<WordSet | null>(null);

  // Pre-fill the labels of the most recently created set for convenience (FR-SET-1).
  const lastCreated = sets.reduce<WordSet | null>(
    (latest, set) =>
      latest === null || set.createdAt > latest.createdAt ? set : latest,
    null,
  );
  const values: SetFields = {
    name: edits.name ?? "",
    langA: edits.langA ?? lastCreated?.langA ?? "",
    langB: edits.langB ?? lastCreated?.langB ?? "",
  };
  const errors = validateSetFields(
    values,
    sets.map((set) => set.name),
  );
  const isValid = Object.keys(errors).length === 0;

  const sortedSets = [...sets].sort((left, right) =>
    left.name.localeCompare(right.name, language),
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const result = createSet(values);
    if (!result.ok) {
      return;
    }
    if (activeSet === null) {
      setActiveSetId(result.set.id);
    }
    setEdits({});
    setSubmitted(false);
    navigate({ name: "setEditor", id: result.set.id });
  }

  return (
    <div className="sets-screen">
      <h1 tabIndex={-1}>{t("nav.sets")}</h1>

      <form className="set-form" onSubmit={handleSubmit} noValidate>
        <h2>{t("sets.new.heading")}</h2>
        <SetFieldsForm
          values={values}
          errors={errors}
          showAllErrors={submitted}
          onChange={setEdits}
        />
        <button type="submit" className="button" disabled={!isValid}>
          {t("sets.create")}
        </button>
      </form>

      {status === "loading" ? null : sortedSets.length === 0 ? (
        <section className="empty-state">
          <h2>{t("sets.empty.title")}</h2>
          <p>{t("sets.empty.body")}</p>
        </section>
      ) : (
        <ul className="set-list" aria-label={t("sets.list.label")}>
          {sortedSets.map((set) => (
            <SetListItem
              key={set.id}
              set={set}
              summary={summarizeSet(
                pairs.filter((pair) => pair.setId === set.id),
                progress.filter((record) => record.setId === set.id),
                now,
              )}
              isActive={set.id === activeSet?.id}
              onUse={() => {
                setActiveSetId(set.id);
              }}
              onDuplicate={() => {
                duplicateSet(set.id, t("sets.copyOf", { name: set.name }));
              }}
              onDelete={() => {
                setDeleting(set);
              }}
            />
          ))}
        </ul>
      )}

      <ImportPanel />

      {deleting !== null && (
        <DeleteSetDialog
          set={deleting}
          wordCount={pairs.filter((pair) => pair.setId === deleting.id).length}
          onConfirm={() => {
            deleteSet(deleting.id);
            setDeleting(null);
          }}
          onCancel={() => {
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
