import { patchNextConfig } from "./config-patch.js";
import type { FrameworkDefinition } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES } from "./vite.js";

const API_MOUNT_ROUTE = `import { app } from "@/server/.taserjs/routes.gen";

const handle = (request: Request) => app.fetch(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
`;

export const nextjs: FrameworkDefinition = {
  id: "nextjs",
  label: "Next.js",
  group: "fullstack",
  serverDir: "src/server",
  ownsDeployment: true,
  requiresNitro: false,
  extensionlessImports: true,
  addsStartScript: false,
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  generator: ({ projectName, packageManager }) => ({
    pkg: "create-next-app@latest",
    args: [
      projectName,
      "--ts",
      "--app",
      "--src-dir",
      "--eslint",
      "--no-tailwind",
      "--import-alias",
      "@/*",
      "--skip-install",
      "--disable-git",
      "--yes",
      `--use-${packageManager}`,
    ],
  }),
  layer: () => ({
    files: { "src/app/api/[[...slug]]/route.ts": API_MOUNT_ROUTE },
    config: {
      candidates: ["next.config.ts", "next.config.mts", "next.config.js", "next.config.mjs"],
      patch: patchNextConfig,
      manualStep:
        'Wrap your Next.js config: import { createTaser } from "@taserjs/plugin/next"; export default createTaser()(nextConfig);',
    },
  }),
};
