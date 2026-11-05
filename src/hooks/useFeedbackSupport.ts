import { isHapticsSupported, isSoundSupported } from "../storage/feedback";

/** Which answer feedback channels this browser offers (NH-4). */
export interface FeedbackSupport {
  readonly sound: boolean;
  readonly haptics: boolean;
}

/** Tells components which feedback settings to show, without importing from `storage/`. */
export function useFeedbackSupport(): FeedbackSupport {
  return { sound: isSoundSupported(), haptics: isHapticsSupported() };
}
