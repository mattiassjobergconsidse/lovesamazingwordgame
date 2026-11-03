import { useI18n } from "../../i18n";
import type { MascotId } from "../../types";
import { MASCOT_IMAGES } from "../common/mascotImages";

interface BossVictoryProps {
  readonly mascot: MascotId;
}

/** Shown on the end screen once the boss is down (NH-15). */
export function BossVictory({ mascot }: BossVictoryProps) {
  const { t } = useI18n();
  const name = t(`mascot.name.${mascot}`);

  return (
    <section className="boss-victory" aria-labelledby="boss-victory-heading">
      <img
        className="boss-victory-art"
        src={MASCOT_IMAGES[mascot]}
        alt=""
        draggable={false}
      />
      <div>
        <h2 id="boss-victory-heading">{t("train.boss.defeated")}</h2>
        <p>{t("train.boss.defeatedText", { name })}</p>
      </div>
    </section>
  );
}
