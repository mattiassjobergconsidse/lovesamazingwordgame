import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "./I18nProvider";
import { useI18n } from "./useI18n";

function wrapperFor(language: "sv" | "en") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <I18nProvider language={language}>{children}</I18nProvider>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useI18n", () => {
  it("FR-I18N-1: translates keys in the selected language", () => {
    const en = renderHook(() => useI18n(), { wrapper: wrapperFor("en") });
    const sv = renderHook(() => useI18n(), { wrapper: wrapperFor("sv") });

    expect(en.result.current.t("nav.home")).toBe("Home");
    expect(sv.result.current.t("nav.home")).toBe("Hem");
    expect(sv.result.current.language).toBe("sv");
  });

  it("FR-I18N-2: picks singular and plural forms and formats the count", () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapperFor("en"),
    });

    expect(result.current.tp("wordCount", 1)).toBe("1 word");
    expect(result.current.tp("wordCount", 1234)).toBe("1,234 words");
    expect(result.current.tp("wordCount", 0)).toBe("0 words");
  });

  it("FR-I18N-2: Swedish uses the same word for singular and plural", () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapperFor("sv"),
    });

    expect(result.current.tp("wordCount", 2)).toBe("2 ord");
  });

  it("throws when used outside a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useI18n())).toThrow(/I18nProvider/);
  });
});
