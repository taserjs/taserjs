import { definePackageBuild } from "../../tsdown.base.ts";

export default definePackageBuild({
  entry: ["src/index.ts", "src/serve.ts", "src/serve-node.ts"],
});
