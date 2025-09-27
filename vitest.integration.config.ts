import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist", "coverage", "src/**/*"],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 30000,
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
