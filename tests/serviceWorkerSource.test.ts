import { describe, expect, it } from "vitest";
import source from "../public/sw.js?raw";

describe("service worker source", () => {
  it("NH-1: cache lookups ignore Vary, so crossorigin scripts and styles load offline", () => {
    // Precached responses are stored without an Origin header, but the page loads its
    // module script and stylesheet with `crossorigin`. A server that answers with
    // `Vary: Origin` would otherwise make every lookup miss and leave a blank page.
    expect(source).toMatch(
      /caches\s*\.match\(\s*lookup,\s*\{[^}]*ignoreVary:\s*true[^}]*\}\s*\)/,
    );
  });
});

