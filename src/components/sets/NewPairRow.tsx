import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n";
import type { WordSet } from "../../types";

interface NewPairRowProps {
  readonly set: WordSet;
  /** Returns `true` when the pair was added. */
  readonly onAdd: (a: string, b: string) => boolean;
}

/** The empty row at the end of the table; a complete row is saved on Enter or when focus leaves (FR-SET-6). */
export function NewPairRow({ set, onAdd }: NewPairRowProps) {
  const { t } = useI18n();
  const hintId = useId();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

  function save(): boolean {
    if (!onAdd(a, b)) {
      return false;
    }
    setA("");
    setB("");
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (event.target === inputARef.current) {
      inputBRef.current?.focus();
    } else if (save() || a.trim() === "") {
      inputARef.current?.focus();
    }
  }

  return (
    <div
      className="pair-row pair-row-new"
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          save();
        }
      }}
    >
      <span className="pair-number" aria-hidden="true">
        +
      </span>
      <input
        ref={inputARef}
        className="text-input"
        data-field="a"
        data-new-row="true"
        value={a}
        aria-label={t("editor.newPair.field", { lang: set.langA })}
        aria-describedby={hintId}
        onChange={(event) => {
          setA(event.target.value);
        }}
      />
      <input
        ref={inputBRef}
        className="text-input"
        data-field="b"
        data-new-row="true"
        value={b}
        aria-label={t("editor.newPair.field", { lang: set.langB })}
        aria-describedby={hintId}
        onChange={(event) => {
          setB(event.target.value);
        }}
      />
      <p id={hintId} className="pair-hint">
        {t("editor.alternativesHint")}
      </p>
    </div>
  );
}
