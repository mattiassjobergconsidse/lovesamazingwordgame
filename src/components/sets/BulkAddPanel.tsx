import { useState } from "react";
import { parseBulkText, type BulkLineProblem } from "../../core/bulkParse";
import { useI18n, type MessageKey } from "../../i18n";
import type { BulkParsedPair } from "../../core/bulkParse";

const PROBLEM_KEYS: Readonly<Record<BulkLineProblem, MessageKey>> = {
  missingSeparator: "bulk.problem.missingSeparator",
  ambiguous: "bulk.problem.ambiguous",
  emptyTerm: "bulk.problem.emptyTerm",
};

interface BulkAddPanelProps {
  readonly onAdd: (pairs: readonly BulkParsedPair[]) => void;
}

/** Paste many lines, preview what will be added and which lines are invalid (FR-SET-8). */
export function BulkAddPanel({ onAdd }: BulkAddPanelProps) {
  const { t, tp } = useI18n();
  const [text, setText] = useState("");
  const result = parseBulkText(text);

  return (
    <details className="bulk-panel">
      <summary>{t("bulk.toggle")}</summary>
      <div className="field">
        <label htmlFor="bulk-text" className="field-label">
          {t("bulk.label")}
        </label>
        <textarea
          id="bulk-text"
          className="text-input bulk-text"
          rows={6}
          value={text}
          aria-describedby="bulk-help"
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <p id="bulk-help" className="pair-hint">
          {t("bulk.help")}
        </p>
      </div>
      {result.pairs.length > 0 && (
        <p role="status">{tp("bulk.valid", result.pairs.length)}</p>
      )}
      {result.invalid.length > 0 && (
        <div>
          <p className="field-error">{t("bulk.invalid")}</p>
          <ul>
            {result.invalid.map((line) => (
              <li key={line.lineNumber}>
                {t("bulk.line", {
                  line: line.lineNumber,
                  text: line.text,
                })}{" "}
                ({t(PROBLEM_KEYS[line.problem])})
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        className="button"
        disabled={result.pairs.length === 0}
        onClick={() => {
          onAdd(result.pairs);
          setText("");
        }}
      >
        {t("bulk.add")}
      </button>
    </details>
  );
}
