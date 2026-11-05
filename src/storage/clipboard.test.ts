import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyText", () => {
  it("NH-5: writes the text to the clipboard", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await copyText("https://example.test/#/share/zabc");

    expect(writeText).toHaveBeenCalledWith("https://example.test/#/share/zabc");
  });

  it("NH-19: rejects when the clipboard is missing", async () => {
    vi.stubGlobal("navigator", {});

    await expect(copyText("x")).rejects.toThrow();
  });

  it("NH-19: rejects when the browser denies the write", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: () => Promise.reject(new Error("denied")) },
    });

    await expect(copyText("x")).rejects.toThrow("denied");
  });
});
