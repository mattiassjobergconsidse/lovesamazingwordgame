import { describe, expect, it } from "vitest";
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
});
