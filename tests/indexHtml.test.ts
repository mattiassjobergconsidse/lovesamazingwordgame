import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

describe("index.html and the Content-Security-Policy", () => {
  it("NH-19: has exactly one inline classic script, which the build allows by hash", () => {
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)];

    expect(inline).toHaveLength(1);
  });

  it("NH-19: has no inline event handlers or javascript: URLs the policy would block", () => {
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  it("NH-19: loads no third-party resources", () => {
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//i);
  });
});
