import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
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
