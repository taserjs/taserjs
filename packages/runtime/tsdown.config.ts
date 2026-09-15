import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/serve.ts", "src/serve-node.ts"],
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
