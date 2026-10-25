import type { FrameworkDefinition } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES, viteConfigPatch } from "./vite.js";

const API_MOUNT_ROUTE = `// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";

import { app } from "../../server/.taserjs/routes.gen";

const handle = ({ request }: { request: Request }) => app.fetch(request);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
      HEAD: handle,
    },
  },
});
`;

export const tanstackStart: FrameworkDefinition = {
  id: "tanstack-start",
  label: "TanStack Start",
  group: "fullstack",
  serverDir: "src/server",
  ownsDeployment: false,
  requiresNitro: false,
  extensionlessImports: false,
  addsStartScript: true,
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  generator: ({ projectName, packageManager }) => ({
    pkg: "@tanstack/cli@latest",
    args: [
      "create",
      projectName,
      "--blank",
      "--no-install",
      "--no-git",
      "--no-toolchain",
      "--yes",
      "--package-manager",
      packageManager,
    ],
  }),
  layer: (scaffold) => ({
    files: { "src/routes/api/$.tsx": API_MOUNT_ROUTE },
    config: viteConfigPatch(scaffold),
  }),
};
