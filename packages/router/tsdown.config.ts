import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cookie.ts", "src/reply.ts", "src/stream.ts"],
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
