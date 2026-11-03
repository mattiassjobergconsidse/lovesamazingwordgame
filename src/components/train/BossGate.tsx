import type { ReactNode } from "react";
import type { BossPoolSource } from "../../core/bossBattle";
import { useBossPool } from "../../hooks/useBossPool";
import { useI18n, type MessageKey } from "../../i18n";
import { routeToHash } from "../../router";

interface BossGateProps {
  readonly title: MessageKey;
  readonly setId: string;
  /** A pool asked for in the route, if any. */
  readonly requested: BossPoolSource | undefined;
  readonly children: ReactNode;
}

/**
 * Lets the Boss Battle open only when some pool has enough words (NH-15).
 * The check happens once on entry, so finishing the fight, which changes the
 * progress, never swaps the end screen for the "not enough words" message.
 */
export function BossGate({ title, setId, requested, children }: BossGateProps) {
  const { t } = useI18n();
  const pool = useBossPool(setId, requested);

  if (pool !== null) {
    return children;
  }
  return (
    <>
      <h1 tabIndex={-1}>{t(title)}</h1>
      <p>{t("train.boss.noPool")}</p>
      <a href={routeToHash({ name: "train" })}>{t("train.boss.toTraining")}</a>
    </>
  );
}
