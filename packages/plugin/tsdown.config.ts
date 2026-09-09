import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/vite.ts",
    "src/rollup.ts",
    "src/webpack.ts",
    "src/rspack.ts",
    "src/esbuild.ts",
    "src/nitro.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  publint: true,
  outExtensions({ format }) {
    const isEsm = format === "es";
    return {
      js: isEsm ? ".js" : ".cjs",
      dts: isEsm ? ".d.ts" : ".d.cts",
    };
  },
});
