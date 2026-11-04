import { describe, expect, it } from "vitest";
import { DEFAULT_MASCOT, MASCOT_IDS, isMascotId } from "./mascots";

describe("mascots", () => {
  it("NH-12: offers the twelve mascots with Volt first and as default", () => {
    expect(MASCOT_IDS).toEqual([
      "volt",
      "pyro",
      "luna",
      "scout",
      "twinkle",
      "shadow",
      "sprout",
      "raptor",
      "jelly",
      "golem",
      "drake",
      "amber",
    ]);
    expect(DEFAULT_MASCOT).toBe("volt");
  });

  it("NH-12: recognises only known mascot ids", () => {
    expect(MASCOT_IDS.every(isMascotId)).toBe(true);
    expect(isMascotId("dino")).toBe(false);
    expect(isMascotId(undefined)).toBe(false);
    expect(isMascotId(1)).toBe(false);
  });
});
