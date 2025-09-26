import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/interface/cli/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  outExtension: () => ({ js: ".mjs" }),
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  dts: true,
  treeshake: true,
  external: ["playwright"],
});
