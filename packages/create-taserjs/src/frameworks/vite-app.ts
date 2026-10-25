import type { FrameworkDefinition, FrameworkTemplate } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES, viteConfigPatch } from "./vite.js";

/** The create-vite templates that ship a `vite.config.ts` for the codemod to patch. */
export const VITE_TEMPLATES: readonly FrameworkTemplate[] = [
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "solid", label: "Solid" },
  { id: "preact", label: "Preact" },
];

export const viteApp: FrameworkDefinition = {
  id: "vite",
  label: "Vite",
  group: "spa",
  serverDir: "src/server",
  ownsDeployment: false,
  extensionlessImports: false,
  addsStartScript: true,
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  templates: VITE_TEMPLATES,
  generator: ({ projectName, template }) => ({
    pkg: "create-vite@latest",
    args: [projectName, "--template", `${template}-ts`, "--no-interactive", "--no-immediate"],
  }),
  layer: (scaffold) => ({ files: {}, config: viteConfigPatch(scaffold, { standalone: false }) }),
};
