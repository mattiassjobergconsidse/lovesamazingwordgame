import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildSharePayload } from "../core/shareFormat";
import { encodeSharePayload } from "../storage/shareLink";
import { setWithPairs } from "../../tests/seed";
import { useSharedSet } from "./useSharedSet";

function rawPayload(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `r${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
}

describe("useSharedSet", () => {
  it("NH-5: starts loading and resolves a valid link to the shared set", async () => {
    const { set, pairs } = setWithPairs("Shared words", [
      ["hus", "house"],
      ["blå", "blue"],
    ]);
    const payload = await encodeSharePayload(buildSharePayload(set, pairs));

    const { result } = renderHook(() => useSharedSet(payload));

    expect(result.current.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    const state = result.current;
    if (state.status !== "ready") {
      throw new Error("expected ready state");
    }
    expect(state.bundle.set.name).toBe("Shared words");
    expect(state.bundle.pairs.map((pair) => pair.a).sort()).toEqual([
      "blå",
      "hus",
    ]);
  });

  it("NH-5: reports a payload that cannot be decoded as invalid", async () => {
    const { result } = renderHook(() => useSharedSet("zNOTVALID"));

    await waitFor(() => {
      expect(result.current.status).toBe("invalid");
    });
  });

  it("NH-5: reports a decodable payload with invalid content as invalid", async () => {
    const { result } = renderHook(() => useSharedSet(rawPayload("not json")));

    await waitFor(() => {
      expect(result.current.status).toBe("invalid");
    });
  });

  it("NH-5: reports an empty payload as invalid", async () => {
    const { result } = renderHook(() => useSharedSet(""));

    await waitFor(() => {
      expect(result.current.status).toBe("invalid");
    });
  });
});
