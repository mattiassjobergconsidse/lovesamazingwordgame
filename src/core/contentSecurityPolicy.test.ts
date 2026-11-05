import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./contentSecurityPolicy";

function directive(policy: string, name: string): string | undefined {
  return policy
    .split("; ")
    .find((part) => part === name || part.startsWith(`${name} `));
}

describe("buildContentSecurityPolicy", () => {
  it("NH-19: allows only the app's own origin by default", () => {
    const policy = buildContentSecurityPolicy([]);

    expect(directive(policy, "default-src")).toBe("default-src 'self'");
    expect(directive(policy, "connect-src")).toBe("connect-src 'self'");
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
    expect(directive(policy, "base-uri")).toBe("base-uri 'self'");
  });

  it("NH-19: allows each inline script by hash and nothing else inline", () => {
    const policy = buildContentSecurityPolicy(["abc=", "def="]);

    expect(directive(policy, "script-src")).toBe(
      "script-src 'self' 'sha256-abc=' 'sha256-def='",
    );
    expect(policy).not.toContain("unsafe-eval");
    expect(directive(policy, "script-src")).not.toContain("unsafe-inline");
    expect(directive(policy, "style-src")).toBe("style-src 'self'");
  });

  it("NH-19: names no third-party host", () => {
    expect(buildContentSecurityPolicy(["x"])).not.toMatch(/https?:/);
  });
});
