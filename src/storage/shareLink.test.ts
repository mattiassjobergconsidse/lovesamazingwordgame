import { afterEach, describe, expect, it, vi } from "vitest";
import { makePair, makeSet } from "../../tests/factories";
import {
  buildSharePayload,
  SHARE_MAX_CHARS,
  SHARE_MAX_INFLATED_BYTES,
} from "../core/shareFormat";
import {
  buildShareLink,
  decodeSharePayload,
  encodeSharePayload,
} from "./shareLink";

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

describe("share link encoding", () => {
  it("NH-5: round-trips text with non-ASCII characters", async () => {
    const json = JSON.stringify({
      n: "Blåbär åäö – 日本語",
      p: [["hus", "hús"]],
    });

    const encoded = await encodeSharePayload(json);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeSharePayload(encoded)).toBe(json);
  });

  it("NH-5: compresses repetitive text", async () => {
    const json = JSON.stringify({ p: Array(200).fill(["hus", "house"]) });

    const encoded = await encodeSharePayload(json);

    expect(encoded.startsWith("z")).toBe(true);
    expect(encoded.length).toBeLessThan(json.length / 4);
  });

  it("NH-5: falls back to plain base64url without CompressionStream", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    vi.stubGlobal("DecompressionStream", undefined);

    const encoded = await encodeSharePayload("hej då");

    expect(encoded.startsWith("r")).toBe(true);
    expect(await decodeSharePayload(encoded)).toBe("hej då");
  });

  it.each(["", "z", "x123", "z!!!", "zAAAA", `r${"A".repeat(10)}%`])(
    "NH-5: rejects the damaged payload %j",
    async (text) => {
      await expect(decodeSharePayload(text)).rejects.toThrow();
    },
  );

  it("NH-5: rejects a payload that is too large", async () => {
    await expect(
      decodeSharePayload(`r${"A".repeat(SHARE_MAX_CHARS)}`),
    ).rejects.toThrow();
  });

  it("NH-19: rejects a tiny payload that inflates beyond the size limit", async () => {
    const bomb = await encodeSharePayload(
      JSON.stringify({ p: "x".repeat(SHARE_MAX_INFLATED_BYTES + 1) }),
    );

    expect(bomb.length).toBeLessThan(SHARE_MAX_CHARS);
    await expect(decodeSharePayload(bomb)).rejects.toThrow(/too large/i);
  });

  it("NH-19: still accepts a large but legitimate set", async () => {
    const json = buildSharePayload(
      makeSet(),
      Array.from({ length: 2000 }, (_, index) =>
        makePair({ a: `word ${String(index)}`, b: `ord ${String(index)}` }),
      ),
    );

    expect(await decodeSharePayload(await encodeSharePayload(json))).toBe(json);
  });

  it("NH-5: builds a link that keeps the page address and uses the share route", () => {
    window.location.hash = "#/sets";

    const link = buildShareLink("zabc");

    expect(link.endsWith("#/share/zabc")).toBe(true);
    expect(link.split("#")).toHaveLength(2);
  });
});
