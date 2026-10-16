import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/** Fills the placeholders in the built service worker (NH-1) with the file list and a content hash. */
function precacheServiceWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "precache-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = join(outDir, "sw.js");
      const files = listFiles(outDir)
        .filter((file) => file !== swPath)
        .sort();
      const hash = createHash("sha256");
      for (const file of files) {
        hash.update(relative(outDir, file)).update(readFileSync(file));
      }
      const urls = [
        "./",
        ...files.map(
          (file) => "./" + relative(outDir, file).split("\\").join("/"),
        ),
      ];
      const source = readFileSync(swPath, "utf8")
        .replace("__BUILD_VERSION__", hash.digest("hex").slice(0, 12))
        .replace('"__PRECACHE_URLS__"', JSON.stringify(urls));
      writeFileSync(swPath, source);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: "/lovesamazingwordgame/",
  plugins: [react(), precacheServiceWorker()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.vitest.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/types.ts",
      ],
      reporter: ["text", "html", "lcov"],
      // Targets from SPEC.md section 10.3. Never lower these to make a build pass.
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
        statements: 85,
        "src/core/**": {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
        "src/storage/**": {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
        "src/hooks/**": {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
        "src/components/**": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
      },
    },
  },
});
