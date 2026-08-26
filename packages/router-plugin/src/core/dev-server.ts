import type { IncomingMessage, ServerResponse } from "node:http";
import { toNodeHandler } from "srvx/node";
import type { ViteDevServer } from "vite";
import { VIRTUAL_APP_ID } from "./constants.js";

type ConnectNext = (err?: unknown) => void;

/**
 * Creates a Vite Connect middleware that loads and runs the Taser virtual app
 * in SSR mode and handles HTTP requests via srvx.
 */
export function createViteDevMiddleware(
  server: ViteDevServer,
  _rootDir: string,
): (req: IncomingMessage, res: ServerResponse, next: ConnectNext) => Promise<void> {
  return async (req: IncomingMessage, res: ServerResponse, next: ConnectNext): Promise<void> => {
    // Let Vite handle internal assets/HMR requests first
    if (req.url && (req.url.startsWith("/@") || req.url.startsWith("/__vite"))) {
      return next();
    }

    try {
      // Load the composed virtual app module using Vite SSR loader
      const mod = await server.ssrLoadModule(VIRTUAL_APP_ID);
      const app = mod.taserApp ?? mod.default ?? mod;

      if (!app || typeof app.fetch !== "function") {
        return next();
      }

      // Convert the Web Fetch handler to a Node-compatible handler
      const nodeHandler = toNodeHandler(app) as (
        req: IncomingMessage,
        res: ServerResponse,
      ) => Promise<void>;
      await nodeHandler(req, res);
    } catch (error) {
      server.ssrFixStacktrace(error as Error);
      next(error);
    }
  };
}
