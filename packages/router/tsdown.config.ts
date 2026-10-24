import { definePackageBuild } from "../../tsdown.base.ts";

export default definePackageBuild({
  entry: ["src/index.ts", "src/reply.ts", "src/stream.ts", "src/middleware/*.ts"],
  cjs: true,
});
