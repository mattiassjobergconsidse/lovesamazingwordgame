import { useRef, type KeyboardEvent } from "react";
import { findDuplicatePairIds } from "../../core/pairText";
import { useI18n } from "../../i18n";
import type { WordPair, WordSet } from "../../types";
import { NewPairRow } from "./NewPairRow";
import { PairRow } from "./PairRow";

interface PairTableProps {
  readonly set: WordSet;
  /** All pairs of the set, used for numbering and duplicate detection. */
  readonly allPairs: readonly WordPair[];
  /** The pairs to show (all of them, or a search result). */
  readonly visiblePairs: readonly WordPair[];
  readonly onAdd: (a: string, b: string) => boolean;
  readonly onChange: (pairId: string, a: string, b: string) => boolean;
  readonly onRemove: (pairId: string) => void;
}

/** Inline-editable word pairs with a keyboard-friendly empty row at the end (FR-SET-6). */
export function PairTable({
  set,
  allPairs,
  visiblePairs,
  onAdd,
  onChange,
  onRemove,
}: PairTableProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const duplicateIds = findDuplicatePairIds(allPairs);
  const numbers = new Map(allPairs.map((pair, index) => [pair.id, index + 1]));

  // Enter in the B field of a saved row moves on to the next row's A field.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      event.key !== "Enter" ||
      !(target instanceof HTMLInputElement) ||
      target.dataset.field !== "b" ||
      target.dataset.newRow === "true"
    ) {
      return;
    }
    const firstFields = [
      ...(containerRef.current?.querySelectorAll<HTMLInputElement>(
        'input[data-field="a"]',
      ) ?? []),
    ];
    const rowA = target
      .closest("li")
      ?.querySelector<HTMLInputElement>('input[data-field="a"]');
    const index =
      rowA === null || rowA === undefined ? -1 : firstFields.indexOf(rowA);
    event.preventDefault();
    firstFields[index + 1]?.focus();
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {visiblePairs.length > 0 && (
        <ol className="pair-list" aria-label={t("editor.pairs.label")}>
          {visiblePairs.map((pair) => (
            <PairRow
              key={pair.id}
              set={set}
              pair={pair}
              number={numbers.get(pair.id) ?? 0}
              isDuplicate={duplicateIds.has(pair.id)}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
        </ol>
      )}
      <NewPairRow set={set} onAdd={onAdd} />
    </div>
  );
}
