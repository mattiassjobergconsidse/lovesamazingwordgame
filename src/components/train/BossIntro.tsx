import { MIN_BOSS_WORDS, type BossPoolSource } from "../../core/bossBattle";
import { useBossPoolCounts } from "../../hooks/useBossPool";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";

interface BossIntroProps {
  readonly setId: string;
  /** The pool of this fight. */
  readonly pool: BossPoolSource;
}

/** Start panel text of a Boss Battle: what the boss is made of and a link to the other pool, if it has enough words. */
export function BossIntro({ setId, pool }: BossIntroProps) {
  const { t } = useI18n();
  const counts = useBossPoolCounts(setId);
  const other: BossPoolSource = pool === "mistakes" ? "hardest" : "mistakes";

  return (
    <>
      <p>{t("train.boss.intro")}</p>
      <p>{t(`train.boss.pool.${pool}`)}</p>
      {counts[other] >= MIN_BOSS_WORDS && (
        <a
          href={routeToHash({ name: "trainMode", mode: "boss", focus: other })}
        >
          {other === "mistakes"
            ? t("train.boss.switchMistakes")
            : t("train.boss.switchHardest")}
        </a>
      )}
    </>
  );
}
