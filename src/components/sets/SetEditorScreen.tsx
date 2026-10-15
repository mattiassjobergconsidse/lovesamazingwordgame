import { useState } from "react";
import { filterPairs } from "../../core/filterPairs";
import { validateSetFields, type SetFields } from "../../core/setValidation";
import { useLibrary } from "../../hooks/useLibrary";
import { useToast } from "../../hooks/useToast";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import { BulkAddPanel } from "./BulkAddPanel";
import { PairTable } from "./PairTable";
import { SetFieldsForm } from "./SetFieldsForm";
import "./sets.css";

/** Search is offered once a set is big enough to need it (FR-SET-9). */
const SEARCH_MIN_WORDS = 20;

/** `#/sets/:id`: edit the set's details and its word pairs; everything autosaves (FR-SET-2, FR-SET-6 to FR-SET-9). */
export function SetEditorScreen({ id }: { readonly id: string }) {
  const { t } = useI18n();
  const {
    status,
    sets,
    pairs,
    updateSet,
    addPair,
    addParsedPairs,
    updatePair,
    removePair,
    restorePair,
  } = useLibrary();
  const { showToast } = useToast();
  const [edits, setEdits] = useState<Partial<SetFields>>({});
  const [query, setQuery] = useState("");
  const set = sets.find((candidate) => candidate.id === id);

  const heading = <h1 tabIndex={-1}>{t("route.setEditor")}</h1>;
  const backLink = (
    <a href={routeToHash({ name: "sets" })}>{t("editor.back")}</a>
  );

  if (status === "loading") {
    return heading;
  }
  if (set === undefined) {
    return (
      <>
        {heading}
        <p>{t("editor.notFound")}</p>
        {backLink}
      </>
    );
  }

  const values: SetFields = {
    name: edits.name ?? set.name,
    langA: edits.langA ?? set.langA,
    langB: edits.langB ?? set.langB,
  };
  const errors = validateSetFields(
    values,
    sets.filter((other) => other.id !== id).map((other) => other.name),
  );
  const setPairs = pairs.filter((pair) => pair.setId === id);
  const visiblePairs = filterPairs(setPairs, query);

  function handleDetailsChange(next: SetFields) {
    setEdits(next);
    // Autosave as soon as the input is valid; invalid input stays a draft.
    updateSet(id, next);
  }

  function handleRemove(pairId: string) {
    const removed = removePair(pairId);
    if (removed === null) {
      return;
    }
    showToast({
      message: t("editor.pair.removed"),
      actionLabel: t("toast.undo"),
      onAction: () => {
        restorePair(removed);
      },
    });
  }

  return (
    <div className="editor-screen">
      {heading}
      {backLink}

      <section aria-labelledby="editor-details-heading" className="set-form">
        <h2 id="editor-details-heading">{t("editor.details")}</h2>
        <SetFieldsForm
          values={values}
          errors={errors}
          showAllErrors
          onChange={handleDetailsChange}
        />
      </section>

      <section aria-labelledby="editor-words-heading">
        <h2 id="editor-words-heading">{t("editor.words")}</h2>
        {setPairs.length > SEARCH_MIN_WORDS && (
          <div className="field">
            <label htmlFor="pair-search" className="field-label">
              {t("editor.search")}
            </label>
            <input
              id="pair-search"
              type="search"
              className="text-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </div>
        )}
        {setPairs.length === 0 && <p>{t("editor.empty")}</p>}
        {setPairs.length > 0 && visiblePairs.length === 0 && (
          <p>{t("editor.search.noResults")}</p>
        )}
        <PairTable
          set={set}
          allPairs={setPairs}
          visiblePairs={visiblePairs}
          onAdd={(a, b) => addPair(id, { a, b }) !== null}
          onChange={(pairId, a, b) => updatePair(pairId, { a, b })}
          onRemove={handleRemove}
        />
        <BulkAddPanel
          onAdd={(parsed) => {
            addParsedPairs(id, parsed);
          }}
        />
      </section>
    </div>
  );
}
