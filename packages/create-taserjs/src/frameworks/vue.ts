import type { FrameworkDefinition } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES, viteConfigPatch } from "./vite.js";

export const vue: FrameworkDefinition = {
  id: "vue",
  label: "Vue (Vue Router)",
  group: "spa",
  serverDir: "src/server",
  ownsDeployment: false,
  requiresNitro: true,
  extensionlessImports: false,
  addsStartScript: true,
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  generator: ({ projectName }) => ({
    pkg: "create-vue@latest",
    args: [projectName, "--ts", "--router", "--bare"],
  }),
  layer: (scaffold) => ({ files: {}, config: viteConfigPatch(scaffold, { standalone: false }) }),
};
