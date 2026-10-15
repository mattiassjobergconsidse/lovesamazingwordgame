import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
// https://vite.dev/config/
export default defineConfig({
  base: "/lovesamazingwordgame/",
  plugins: [react()],
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
