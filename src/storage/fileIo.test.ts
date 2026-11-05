import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadTextFile,
  MAX_IMPORT_FILE_BYTES,
  OBJECT_URL_REVOKE_DELAY_MS,
  readFileText,
} from "./fileIo";

const createObjectURL = vi.fn(() => "blob:test");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe("downloadTextFile", () => {
  it("FR-IO-1: clicks a temporary download link and removes it again", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadTextFile("set.json", "{}", "application/json");

    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("NH-19: keeps the object URL alive until the browser has started the download", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );

    downloadTextFile("set.csv", "a,b", "text/csv");

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("NH-19: cleans up and rethrows when the click fails", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => {
      downloadTextFile("set.json", "{}", "application/json");
    }).toThrow("blocked");

    expect(document.querySelector("a[download]")).toBeNull();
    vi.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

describe("readFileText", () => {
  it("FR-IO-2: reads a small file as text", async () => {
    vi.useRealTimers();

    expect(await readFileText(new File(["hej då"], "a.csv"))).toBe("hej då");
  });

  it("NH-19: refuses a file above the size limit without reading it", async () => {
    const file = new File(["x"], "big.json");
    Object.defineProperty(file, "size", { value: MAX_IMPORT_FILE_BYTES + 1 });

    await expect(readFileText(file)).rejects.toThrow(/too large/i);
  });
});
