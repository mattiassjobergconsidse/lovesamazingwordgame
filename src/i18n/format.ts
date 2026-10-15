import type { UiLanguage } from "../types";

/** Plural categories used by the supported UI languages. */
export type PluralForm = "one" | "other";

/**
 * Selects the plural form for a count using `Intl.PluralRules`.
 *
 * @param language UI language.
 * @param count The number the noun refers to.
 */
export function selectPlural(language: UiLanguage, count: number): PluralForm {
  return new Intl.PluralRules(language).select(count) === "one"
    ? "one"
    : "other";
}

/**
 * Formats a number with the conventions of the UI language.
 *
 * @param language UI language.
 * @param value The number to format.
 */
export function formatNumber(language: UiLanguage, value: number): string {
  return new Intl.NumberFormat(language).format(value);
}

/**
 * Replaces `{name}` placeholders. Unknown placeholders are left untouched so
 * mistakes stay visible.
 *
 * @param template Message with placeholders.
 * @param params Values by placeholder name.
 */
export function interpolate(
  template: string,
  params: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
