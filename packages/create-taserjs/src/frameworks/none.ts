import type { FrameworkDefinition } from "./types.js";

export const none: FrameworkDefinition = {
  id: "none",
  label: "API only",
  group: "api",
  serverDir: "src",
  ownsDeployment: false,
  extensionlessImports: false,
  addsStartScript: true,
  dependencies: ["@taserjs/router", "@taserjs/runtime"],
  devDependencies: ["@taserjs/cli", "@taserjs/plugin", "typescript", "vite"],
  layer: () => ({ files: {} }),
};
