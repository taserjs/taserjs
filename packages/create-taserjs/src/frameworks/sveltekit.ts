import type { FrameworkDefinition } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES, viteConfigPatch } from "./vite.js";

// `fallback` answers every HTTP method that has no dedicated export.
const API_MOUNT_ROUTE = `import type { RequestHandler } from "./$types";

import { app } from "../../../server/.taserjs/routes.gen";

export const fallback: RequestHandler = ({ request }) => app.fetch(request);
`;

export const sveltekit: FrameworkDefinition = {
  id: "sveltekit",
  label: "SvelteKit",
  group: "fullstack",
  serverDir: "src/server",
  ownsDeployment: true,
  extensionlessImports: false,
  addsStartScript: false,
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  generator: ({ projectName }) => ({
    pkg: "sv@latest",
    args: [
      "create",
      projectName,
      "--template",
      "minimal",
      "--types",
      "ts",
      "--no-add-ons",
      "--no-install",
    ],
  }),
  layer: (scaffold) => ({
    files: { "src/routes/api/[...path]/+server.ts": API_MOUNT_ROUTE },
    config: viteConfigPatch(scaffold),
  }),
};
