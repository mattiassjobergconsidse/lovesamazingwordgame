import type { MascotMood } from "../../core/mascotPhrases";
import type { MascotSpeech } from "../../hooks/useMascotSpeech";
import { useSettings } from "../../hooks/useSettings";
import "./common.css";
import "./mascot.css";
import { MASCOT_IMAGES } from "./mascotImages";

interface MascotProps {
  /** Speech bubble state from `useMascotSpeech`; omit for a silent mascot. */
  readonly speech?: Pick<MascotSpeech, "message" | "mood">;
  /** Forces a mood, e.g. cheering after a perfect session, when the mascot is not speaking. */
  readonly mood?: MascotMood;
  /**
   * `hero` sits inline next to a heading. `corner` floats in the bottom corner during
   * training and only appears while it has something to say.
   */
  readonly placement?: "hero" | "corner";
}

/**
 * The user's chosen mascot (NH-12) with an optional speech bubble. The artwork is
 * decorative, so it is hidden from assistive technology; the bubble text goes into
 * a polite live region that never takes focus.
 */
export function Mascot({
  speech,
  mood: forcedMood,
  placement = "hero",
}: MascotProps) {
  const { settings } = useSettings();
  const message = speech?.message ?? null;
  const mood = forcedMood ?? speech?.mood ?? "idle";
  const showArtwork = placement === "hero" || message !== null;

  return (
    <div className={`mascot-stage mascot-stage-${placement}`}>
      {showArtwork && (
        <span
          className={`mascot mascot-${mood}`}
          data-testid="mascot"
          data-mascot={settings.mascot}
          aria-hidden="true"
        >
          <img src={MASCOT_IMAGES[settings.mascot]} alt="" draggable={false} />
        </span>
      )}
      <div className="mascot-bubble-slot" aria-live="polite" aria-atomic="true">
        {message !== null && (
          <p className="mascot-bubble" key={message}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
