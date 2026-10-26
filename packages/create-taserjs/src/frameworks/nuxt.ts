import { patchNuxtConfig } from "./config-patch.js";
import type { FrameworkDefinition } from "./types.js";
import { UI_TASER_DEPENDENCIES, UI_TASER_DEV_DEPENDENCIES } from "./vite.js";

// Nuxt prefixes `server/api` with `/api`, which matches `defineTaser().basePath("/api")`.
// `defineEventHandler` and `toWebRequest` are auto-imported by Nuxt's server runtime.
const API_MOUNT_ROUTE = `import { app } from "../../api/.taserjs/routes.gen";

export default defineEventHandler((event) => app.fetch(toWebRequest(event)));
`;

// A catch-all route does not match its own prefix, so the bare `/api` needs its own entry.
const API_ROOT_ROUTE = `export { default } from "./[...slug]";
`;

export const nuxt: FrameworkDefinition = {
  id: "nuxt",
  label: "Nuxt",
  group: "fullstack",
  // Nuxt scans `server/` and `app/` only, so Taser's `routes/` folder would be misregistered anywhere in there.
  serverDir: "api",
  ownsDeployment: true,
  extensionlessImports: false,
  addsStartScript: false,
  clientFile: "app/api.ts",
  // Server-rendered code runs `fetch` in Node, which cannot resolve a relative URL.
  clientBaseUrl: "http://localhost:3000/api",
  dependencies: UI_TASER_DEPENDENCIES,
  devDependencies: UI_TASER_DEV_DEPENDENCIES,
  generator: ({ projectName, packageManager }) => ({
    pkg: "create-nuxt@latest",
    args: [
      projectName,
      "--template",
      "minimal",
      "--no-install",
      "--no-gitInit",
      "--no-modules",
      "--packageManager",
      packageManager,
    ],
  }),
  layer: () => ({
    files: {
      "server/api/[...slug].ts": API_MOUNT_ROUTE,
      "server/api/index.ts": API_ROOT_ROUTE,
    },
    config: {
      candidates: ["nuxt.config.ts", "nuxt.config.mts", "nuxt.config.js", "nuxt.config.mjs"],
      patch: patchNuxtConfig,
      manualStep:
        'Add Taser.js to your Nuxt config: import { taser } from "@taserjs/plugin/vite"; export default defineNuxtConfig({ vite: { plugins: [taser({ cwd: process.cwd() })] } });',
    },
  }),
};
