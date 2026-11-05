import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { buildContentSecurityPolicy } from "./src/core/contentSecurityPolicy.ts";

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

/**
 * Adds a Content-Security-Policy meta tag to the built `index.html` (NH-19).
 * Build only: the dev server injects inline scripts for hot reloading that the policy would block.
 */
function contentSecurityPolicy(): Plugin {
  const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  const charsetTag = '<meta charset="UTF-8" />';
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const hashes = [...html.matchAll(inlineScript)].map((match) =>
          createHash("sha256").update(match[1]).digest("base64"),
        );
        if (!html.includes(charsetTag)) {
          throw new Error("index.html must keep its UTF-8 meta charset tag");
        }
        const policy = buildContentSecurityPolicy(hashes);
        return html.replace(
          charsetTag,
          `${charsetTag}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />\n    <meta name="referrer" content="no-referrer" />`,
        );
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: "/lovesamazingwordgame/",
  plugins: [react(), contentSecurityPolicy(), precacheServiceWorker()],
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 15000,
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
