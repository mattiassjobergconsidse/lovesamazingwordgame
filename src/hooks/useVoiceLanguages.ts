import { useEffect, useState } from "react";
import { listVoiceLanguages, onVoicesChanged } from "../storage/speech";

/** The languages the browser has voices for; updates when voices finish loading (NH-2). */
export function useVoiceLanguages(): readonly string[] {
  const [languages, setLanguages] = useState(() => listVoiceLanguages());

  useEffect(() => {
    const refresh = () => {
      setLanguages(listVoiceLanguages());
    };
    refresh();
    return onVoicesChanged(refresh);
  }, []);

  return languages;
}
