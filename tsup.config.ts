import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: "esm",
    outDir: "dist",
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    dts: true,
});
