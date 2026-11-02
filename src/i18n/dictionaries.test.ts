import { describe, expect, it } from "vitest";
import { MASCOT_EVENTS } from "../core/mascotPhrases";
import { MASCOT_IDS } from "../core/mascots";
import { en } from "./en";
import { sv } from "./sv";

describe("dictionaries", () => {
  it("FR-I18N-2: sv and en have identical keys", () => {
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort());
  });

  it("FR-I18N-2: no message is empty", () => {
    for (const dictionary of [en, sv]) {
      for (const [key, message] of Object.entries(dictionary)) {
        expect(message.trim(), key).not.toBe("");
      }
    }
  });

  it("FR-I18N-2: both languages use the same placeholders per key", () => {
    const placeholders = (message: string): string[] =>
      message.match(/\{\w+\}/g) ?? [];
    const swedish: Readonly<Record<string, string>> = sv;
    for (const [key, message] of Object.entries(en)) {
      expect(placeholders(swedish[key] ?? ""), key).toEqual(
        placeholders(message),
      );
    }
  });

  it("NH-12: every mascot has three phrases per event in both languages, and no two mascots share a phrase", () => {
    const seen = new Map<string, string>();
    for (const [language, dictionary] of [
      ["en", en],
      ["sv", sv],
    ] as const) {
      const lookup: Readonly<Record<string, string>> = dictionary;
      for (const mascot of MASCOT_IDS) {
        for (const event of MASCOT_EVENTS) {
          for (const index of [1, 2, 3]) {
            const key = `mascot.${mascot}.${event}.${String(index)}`;
            const phrase = lookup[key];
            expect(phrase, `${language} ${key}`).toBeTruthy();
            const owner = seen.get(`${language}:${phrase ?? ""}`);
            expect(owner ?? mascot, `${language} ${key}`).toBe(mascot);
            seen.set(`${language}:${phrase ?? ""}`, mascot);
          }
        }
      }
    }
  });
});
