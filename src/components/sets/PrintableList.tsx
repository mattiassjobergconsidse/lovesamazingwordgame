import type { WordPair, WordSet } from "../../types";
import { useI18n } from "../../i18n";

/** A plain table of the whole set, shown only when printing (NH-7). */
export function PrintableList({
  set,
  pairs,
}: {
  readonly set: WordSet;
  readonly pairs: readonly WordPair[];
}) {
  const { t } = useI18n();
  return (
    <div className="print-only">
      <h2>{set.name}</h2>
      <table aria-label={t("editor.print.pairs")} className="print-table">
        <thead>
          <tr>
            <th scope="col">{set.langA}</th>
            <th scope="col">{set.langB}</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => (
            <tr key={pair.id}>
              <td>{pair.a}</td>
              <td>{pair.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
