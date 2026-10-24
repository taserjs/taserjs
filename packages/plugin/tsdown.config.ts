import { definePackageBuild } from "../../tsdown.base.ts";

export default definePackageBuild({
  entry: [
    "src/vite.ts",
    "src/rollup.ts",
    "src/rolldown.ts",
    "src/webpack.ts",
    "src/rspack.ts",
    "src/esbuild.ts",
    "src/nitro.ts",
    "src/next.ts",
  ],
});
