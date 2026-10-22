import { useId, useState, type ChangeEvent } from "react";
import type {
  ImportProblem,
  ProblemReason,
  SetBundle,
} from "../../core/exportFormat";
import type { ConflictChoice, ImportConflict } from "../../core/importPlan";
import { useDataExchange } from "../../hooks/useDataExchange";
import { useToast } from "../../hooks/useToast";
import { useI18n, type MessageKey } from "../../i18n";
import "../common/common.css";
import { ImportConflictDialog } from "./ImportConflictDialog";
import "./data.css";

const PROBLEM_KEYS: Readonly<Record<ProblemReason, MessageKey>> = {
  invalidJson: "data.problem.invalidJson",
  notAnObject: "data.problem.notAnObject",
  unsupportedVersion: "data.problem.unsupportedVersion",
  missing: "data.problem.missing",
  wrongType: "data.problem.wrongType",
  empty: "data.problem.empty",
  tooLong: "data.problem.tooLong",
  outOfRange: "data.problem.outOfRange",
  unknownReference: "data.problem.unknownReference",
  duplicateId: "data.problem.duplicateId",
  duplicateName: "data.problem.duplicateName",
  unreadable: "data.problem.unreadable",
  tooLarge: "data.problem.tooLarge",
};

interface PendingImport {
  readonly bundles: readonly SetBundle[];
  readonly conflicts: readonly ImportConflict[];
}

/** Pick a JSON or CSV file; shows what is wrong with it or imports it (FR-IO-2, FR-IO-3). */
export function ImportPanel() {
  const { t, tp } = useI18n();
  const { ready, readImportFile, commitImport } = useDataExchange();
  const { showToast } = useToast();
  const inputId = useId();
  const [problems, setProblems] = useState<readonly ImportProblem[]>([]);
  const [pending, setPending] = useState<PendingImport | null>(null);

  async function finish(
    bundles: readonly SetBundle[],
    choices: ReadonlyMap<string, ConflictChoice>,
  ) {
    const count = await commitImport(bundles, choices);
    if (count === null) {
      return;
    }
    showToast({
      message:
        count === 0 ? t("data.import.nothing") : tp("data.import.done", count),
    });
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }
    setProblems([]);
    const draft = await readImportFile(file);
    // Clear the input so choosing the same file again triggers a new change event.
    input.value = "";
    if (!draft.ok) {
      setProblems(draft.problems);
    } else if (draft.conflicts.length > 0) {
      setPending({ bundles: draft.bundles, conflicts: draft.conflicts });
    } else {
      await finish(draft.bundles, new Map());
    }
  }

  return (
    <section aria-labelledby={`${inputId}-heading`} className="data-panel">
      <h2 id={`${inputId}-heading`}>{t("data.import.heading")}</h2>
      <div className="field">
        <label htmlFor={inputId} className="field-label">
          {t("data.import.file")}
        </label>
        <input
          id={inputId}
          type="file"
          disabled={!ready}
          accept=".json,.csv,.txt,application/json,text/csv,text/plain"
          onChange={(event) => {
            void handleFile(event);
          }}
        />
      </div>
      {problems.length > 0 && (
        <div role="alert">
          <p className="field-error">{t("data.import.problems")}</p>
          <ul className="problem-list">
            {problems.map((problem) => (
              <li key={`${problem.path}:${problem.reason}`}>
                {problem.path === ""
                  ? t(PROBLEM_KEYS[problem.reason])
                  : t("data.import.problem", {
                      path: problem.path,
                      reason: t(PROBLEM_KEYS[problem.reason]),
                    })}
              </li>
            ))}
          </ul>
        </div>
      )}
      {pending !== null && (
        <ImportConflictDialog
          conflicts={pending.conflicts}
          onCancel={() => {
            setPending(null);
          }}
          onConfirm={(choices) => {
            setPending(null);
            void finish(pending.bundles, choices);
          }}
        />
      )}
    </section>
  );
}
