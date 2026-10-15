import { useRef, useState, type KeyboardEvent } from "react";
import { formatTerms } from "../../core/pairText";
import { useI18n } from "../../i18n";
import type { WordPair, WordSet } from "../../types";

interface PairRowProps {
  readonly set: WordSet;
  readonly pair: WordPair;
  /** Position in the whole set (1-based), used in accessible names. */
  readonly number: number;
  readonly isDuplicate: boolean;
  readonly onChange: (pairId: string, a: string, b: string) => boolean;
  readonly onRemove: (pairId: string) => void;
}

interface Draft {
  readonly a: string;
  readonly b: string;
}

/** One editable word pair; edits are saved when the focus leaves the row (FR-SET-6). */
export function PairRow({
  set,
  pair,
  number,
  isDuplicate,
  onChange,
  onRemove,
}: PairRowProps) {
  const { t } = useI18n();
  const rowRef = useRef<HTMLLIElement>(null);
  // `null` means "not being edited": the inputs then show the stored values.
  const [draft, setDraft] = useState<Draft | null>(null);
  const storedA = formatTerms(pair.a, pair.altA);
  const storedB = formatTerms(pair.b, pair.altB);
  const valueA = draft?.a ?? storedA;
  const valueB = draft?.b ?? storedB;

  function commit() {
    if (draft !== null && (draft.a !== storedA || draft.b !== storedB)) {
      // An invalid edit (an emptied field) is dropped and the stored text shown again.
      onChange(pair.id, draft.a, draft.b);
    }
    setDraft(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    const target = event.target;
    if (event.key !== "Enter" || !(target instanceof HTMLInputElement)) {
      return;
    }
    if (target.dataset.field === "a") {
      event.preventDefault();
      rowRef.current
        ?.querySelector<HTMLInputElement>('input[data-field="b"]')
        ?.focus();
    }
  }

  return (
    <li
      ref={rowRef}
      className="pair-row"
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          commit();
        }
      }}
    >
      <span className="pair-number" aria-hidden="true">
        {number}
      </span>
      <input
        className="text-input"
        data-field="a"
        value={valueA}
        aria-label={t("editor.pair.field", { lang: set.langA, number })}
        onChange={(event) => {
          setDraft({ a: event.target.value, b: valueB });
        }}
      />
      <input
        className="text-input"
        data-field="b"
        value={valueB}
        aria-label={t("editor.pair.field", { lang: set.langB, number })}
        onChange={(event) => {
          setDraft({ a: valueA, b: event.target.value });
        }}
      />
      <button
        type="button"
        className="icon-button"
        aria-label={t("editor.pair.remove", { number })}
        onClick={() => {
          onRemove(pair.id);
        }}
      >
        ✕
      </button>
      {isDuplicate && (
        <p className="pair-warning" role="note">
          <span aria-hidden="true">⚠ </span>
          {t("editor.pair.duplicate")}{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              onRemove(pair.id);
            }}
          >
            {t("editor.pair.removeDuplicate")}
          </button>
        </p>
      )}
    </li>
  );
}
