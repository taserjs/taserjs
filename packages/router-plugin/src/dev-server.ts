import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "pathe";
import type { Connect, ViteDevServer } from "vite";
import { VIRTUAL_APP_ID } from "./core/context.js";

type SrvxModule = {
  NodeRequest: new (ctx: { req: IncomingMessage; res: ServerResponse }) => Request;
  sendNodeResponse: (res: ServerResponse, webRes: Response) => Promise<void>;
};

/**
 * Load srvx resolved against the user's project (they own the dependency),
 * falling back to whatever Node can find from this package.
 */
async function loadSrvx(rootDir: string): Promise<SrvxModule> {
  try {
    const appRequire = createRequire(join(rootDir, "package.json"));
    return (await import(pathToFileURL(appRequire.resolve("srvx")).href)) as unknown as SrvxModule;
  } catch {
    try {
      return (await import("srvx")) as unknown as SrvxModule;
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
 * Connect/Vite dev middleware that dispatches incoming requests into the
 * composed app (`#taserjs/virtual/app`) loaded through Vite's SSR pipeline.
 *
 * Route files, host server and virtual modules all get instant HMR.
 */
export function createViteDevMiddleware(
  server: ViteDevServer,
  rootDir: string,
): Connect.NextHandleFunction {
  let srvxPromise: Promise<SrvxModule> | undefined;

  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    // Let Vite internal endpoints pass through untouched
    if (req.url && (req.url.startsWith("/@") || req.url.startsWith("/__vite"))) {
      next();
      return;
    }

    try {
      if (!srvxPromise) {
        srvxPromise = loadSrvx(rootDir);
      }
      const srvx = await srvxPromise;

      const mod = (await server.ssrLoadModule(VIRTUAL_APP_ID)) as ComposedAppModule;
      const nodeReq = new srvx.NodeRequest({ req, res });
      const response = await mod.handler(nodeReq);

      if (response) {
        await srvx.sendNodeResponse(res, response);
        return;
      }

      next();
    } catch (error) {
      if (error instanceof Error && !res.headersSent) {
        server.ssrFixStacktrace(error);
      }
      next(error);
    }
  };
}
