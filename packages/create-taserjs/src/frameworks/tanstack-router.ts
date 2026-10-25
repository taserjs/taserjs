import type { FrameworkDefinition } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES, viteConfigPatch } from "./vite.js";

export const tanstackRouter: FrameworkDefinition = {
  id: "tanstack-router",
  label: "TanStack Router",
  group: "spa",
  serverDir: "src/server",
  ownsDeployment: false,
  requiresNitro: true,
  extensionlessImports: false,
  addsStartScript: true,
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  generator: ({ projectName, packageManager }) => ({
    pkg: "@tanstack/cli@latest",
    args: [
      "create",
      projectName,
      "--router-only",
      "--blank",
      "--no-install",
      "--no-git",
      "--no-toolchain",
      "--yes",
      "--package-manager",
      packageManager,
    ],
  }),
  // The SPA is served by Nitro next to the API, so Taser registers as a Nitro handler.
  layer: (scaffold) => ({ files: {}, config: viteConfigPatch(scaffold, { standalone: false }) }),
};
