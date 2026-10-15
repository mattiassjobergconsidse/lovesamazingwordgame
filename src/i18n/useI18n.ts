import { useContext } from "react";
import { I18nContext, type I18nValue } from "./I18nContext";

/**
 * Access translations and the current UI language.
 *
 * @throws If used outside an `I18nProvider`.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value === null) {
    throw new Error("useI18n must be used inside an I18nProvider");
  }
  return value;
}
