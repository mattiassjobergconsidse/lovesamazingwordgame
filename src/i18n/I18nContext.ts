import { createContext } from "react";
import type { UiLanguage } from "../types";
import type { MessageKey } from "./en";

type PluralBase<K extends string> = K extends `${infer Base}.one`
  ? Base
  : never;

/** Message keys that have `.one` and `.other` variants. */
export type PluralKey = PluralBase<MessageKey>;

export type MessageParams = Readonly<Record<string, string | number>>;

/** What components get from `useI18n()`. */
export interface I18nValue {
  readonly language: UiLanguage;
  /** Translates a key, replacing `{name}` placeholders from `params`. */
  readonly t: (key: MessageKey, params?: MessageParams) => string;
  /** Translates a plural key for `count`; provides `{count}` formatted for the language. */
  readonly tp: (key: PluralKey, count: number) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);
