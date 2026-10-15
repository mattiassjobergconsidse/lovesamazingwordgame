/**
 * Global test setup, loaded by Vitest before every test file (see `test.setupFiles` in vite.config.ts).
 */
import "@testing-library/jest-dom/vitest";
// Provides an in-memory IndexedDB implementation so storage code can be tested in jsdom.
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

// jsdom has no canvas implementation; axe-core probes it for colour-contrast checks.
// Contrast is verified in real browsers instead (FR-THEME-2), so a null context is sufficient here.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => null,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
