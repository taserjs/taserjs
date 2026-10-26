import { patchReactRouterRoutes } from "./config-patch.js";
import type { FrameworkDefinition } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES, viteConfigPatch } from "./vite.js";

// A resource route has no default export, so React Router calls `loader` for GET and HEAD and
// `action` for every other method.
const API_MOUNT_ROUTE = `import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { app } from "../server/.taserjs/routes.gen";

const handle = ({ request }: LoaderFunctionArgs | ActionFunctionArgs) => app.fetch(request);

export const loader = handle;
export const action = handle;
`;

export const reactRouter: FrameworkDefinition = {
  id: "react-router",
  label: "React Router",
  group: "fullstack",
  serverDir: "app/server",
  ownsDeployment: true,
  extensionlessImports: false,
  addsStartScript: false,
  clientFile: "app/api.ts",
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  generator: ({ projectName, packageManager }) => ({
    pkg: "create-react-router@latest",
    args: [
      projectName,
      "--yes",
      "--no-install",
      "--no-git-init",
      "--no-agent-skills",
      "--package-manager",
      packageManager,
    ],
  }),
  layer: (scaffold) => ({
    files: { "app/routes/api.ts": API_MOUNT_ROUTE },
    config: [
      viteConfigPatch(scaffold),
      {
        candidates: ["app/routes.ts"],
        patch: patchReactRouterRoutes,
        manualStep:
          'Register the API in app/routes.ts: import { route } from "@react-router/dev/routes"; and add route("api/*", "routes/api.ts") to the exported array.',
      },
    ],
  }),
};
