import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "pathe";
import type { ViteDevServer } from "vite";
import { VIRTUAL_APP_ID } from "./core/context.js";

type SrvxModule = typeof import("srvx");

/**
 * Load srvx resolved against the user's project (they own the dependency),
 * falling back to whatever Node can find from this package.
 */
async function loadSrvx(rootDir: string): Promise<SrvxModule> {
  try {
    const appRequire = createRequire(join(rootDir, "package.json"));
    return await import(pathToFileURL(appRequire.resolve("srvx")).href);
  } catch {
    try {
      return await import("srvx");
    } catch {
      throw new Error(
        "[taser] The built-in server needs `srvx`. Install it in your project:\n\n  pnpm add srvx\n",
      );
    }
  }
}

type ComposedAppModule = {
  handler: (request: Request) => Promise<Response | undefined> | Response | undefined;
};

/**
 * Dev adapter: an srvx server that dispatches every request into the composed
 * app (`#taserjs/virtual/app`) loaded through Vite's SSR pipeline, so route
 * files, framework code and virtual modules all get HMR.
 */
export async function startDevServer(
  viteServer: ViteDevServer,
  options: { rootDir: string; port: number },
): Promise<{ close: () => Promise<void> }> {
  const srvx = await loadSrvx(options.rootDir);

  const instance = srvx.serve({
    port: options.port,
    async fetch(request) {
      try {
        const mod = (await viteServer.ssrLoadModule(VIRTUAL_APP_ID)) as ComposedAppModule;
        return (await mod.handler(request)) ?? notFound();
      } catch (error) {
        console.error("[taser] request failed:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
  });

  return {
    close: async () => {
      await instance.close();
    },
  };
}

function notFound(): Response {
  // globalThis.Response is FastResponse once the composed app module loads.
  return new (globalThis.Response as typeof Response)(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}
