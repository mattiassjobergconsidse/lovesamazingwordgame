import { useI18n } from "../../i18n";
import type { BossState } from "../../core/bossBattle";
import type { AnswerResult, MascotId } from "../../types";
import { Mascot } from "../common/Mascot";

interface BossHudProps {
  readonly boss: BossState;
  /** Which mascot plays the boss. */
  readonly mascot: MascotId;
  /** The latest answer, so the boss can flinch or grin; `null` before the first one. */
  readonly lastResult: AnswerResult | null;
  /** Number of answers so far; changes with each one so the reaction replays. */
  readonly answerCount: number;
}

/**
 * The boss of a Boss Battle (NH-15): its mascot art, a health bar and a polite
 * status line. The art is decorative; the meter and the status carry the information.
 */
export function BossHud({
  boss,
  mascot,
  lastResult,
  answerCount,
}: BossHudProps) {
  const { t } = useI18n();
  const name = t(`mascot.name.${mascot}`);
  const healthText = t("train.boss.healthValue", {
    hp: boss.hp,
    max: boss.maxHp,
  });
  const status =
    lastResult === null
      ? ""
      : lastResult === "wrong"
        ? t("train.boss.healed")
        : t("train.boss.hit");

  return (
    <section
      className="boss-hud"
      aria-label={t("train.boss.bossName", { name })}
    >
      <Mascot
        key={answerCount}
        mascot={mascot}
        mood={
          lastResult === null
            ? "idle"
            : lastResult === "wrong"
              ? "cheer"
              : "oops"
        }
      />
      <div className="boss-bars">
        <p className="boss-name">{t("train.boss.bossName", { name })}</p>
        <meter
          className="boss-health"
          min={0}
          max={boss.maxHp}
          value={boss.hp}
          aria-label={t("train.boss.health")}
          aria-valuetext={healthText}
        >
          {healthText}
        </meter>
        <p className="boss-health-text">{healthText}</p>
        <p className="boss-status" role="status">
          {status}
        </p>
      </div>
    </section>
  );
}
