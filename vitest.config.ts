import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist", "coverage", "tests/**/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      enabled: true,
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/index.ts",
        "**/index.js",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/domain": resolve(__dirname, "./src/domain"),
      "@/application": resolve(__dirname, "./src/application"),
      "@/infrastructure": resolve(__dirname, "./src/infrastructure"),
      "@/interface": resolve(__dirname, "./src/interface"),
    },
  },
});
