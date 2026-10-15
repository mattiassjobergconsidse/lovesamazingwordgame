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

// Recent Node versions ship an experimental global `localStorage` that shadows jsdom's and is unusable
// without `--localstorage-file`. Install an in-memory Storage so tests behave like a browser.
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

if (typeof globalThis.localStorage.clear !== "function") {
  const storage = new MemoryStorage();
  for (const target of [globalThis, window]) {
    Object.defineProperty(target, "localStorage", {
      configurable: true,
      get: () => storage,
    });
  }
}

// jsdom has no matchMedia; default to "no preference" (light, no reduced motion). Tests override it with vi.spyOn.
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
