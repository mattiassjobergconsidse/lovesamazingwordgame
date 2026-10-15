import { useMemo, type ReactNode } from "react";
import type { UiLanguage } from "../types";
import { en } from "./en";
import { formatNumber, interpolate, selectPlural } from "./format";
import { I18nContext, type I18nValue } from "./I18nContext";
import { sv } from "./sv";

const DICTIONARIES = { en, sv } as const;

interface I18nProviderProps {
  readonly language: UiLanguage;
  readonly children: ReactNode;
}

/** Provides translation functions for the selected UI language. */
export function I18nProvider({ language, children }: I18nProviderProps) {
  const value = useMemo<I18nValue>(() => {
    const dictionary = DICTIONARIES[language];
    const t: I18nValue["t"] = (key, params) =>
      interpolate(dictionary[key], params ?? {});
    const tp: I18nValue["tp"] = (key, count) =>
      t(`${key}.${selectPlural(language, count)}` as const, {
        count: formatNumber(language, count),
      });
    return { language, t, tp };
  }, [language]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
