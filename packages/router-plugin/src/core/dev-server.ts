import type { IncomingMessage, ServerResponse } from "node:http";
import { toNodeHandler } from "srvx/node";
import { normalizeScope } from "@taserjs/router-utils";
import type { ViteDevServer } from "vite";
import { VIRTUAL_APP_ID } from "./constants.js";

type ConnectNext = (err?: unknown) => void;

let cachedNodeHandler: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | undefined;

/**
 * Invalidates the cached dev server virtual app and handler.
 * Called when routes or manifests change.
 */
export function invalidateDevServerCache(): void {
  cachedNodeHandler = undefined;
}

export type ViteDevMiddlewareOptions = {
  basePath?: string | undefined;
};

const VITE_INTERNAL_PREFIXES = ["/@", "/__vite", "/__open-in-editor", "/@fs/", "/@id/"];
const VITE_QUERY_PATTERN = /[?&](?:import|raw|url|worker)\b/;

function shouldSkipDevRequest(url: string, basePath?: string): boolean {
  if (basePath && basePath !== "/" && !url.startsWith(basePath)) {
    return true;
  }

  for (let i = 0; i < VITE_INTERNAL_PREFIXES.length; i++) {
    if (url.startsWith(VITE_INTERNAL_PREFIXES[i]!)) {
      return true;
    }
  }

  if (url.startsWith("/node_modules/")) {
    return true;
  }

  if (VITE_QUERY_PATTERN.test(url)) {
    return true;
  }

  return false;
}

/**
 * Creates a Vite Connect middleware that loads and runs the Taser virtual app
 * in SSR mode and handles HTTP requests via srvx.
 */
export function createViteDevMiddleware(
  server: ViteDevServer,
  _rootDir: string,
  options: ViteDevMiddlewareOptions = {},
): (req: IncomingMessage, res: ServerResponse, next: ConnectNext) => Promise<void> {
  const normalizedBasePath = normalizeScope(options.basePath);

  return async (req: IncomingMessage, res: ServerResponse, next: ConnectNext): Promise<void> => {
    const url = req.url;
    if (!url || shouldSkipDevRequest(url, normalizedBasePath)) {
      return next();
    }

    try {
      if (!cachedNodeHandler) {
        const mod = (await server.ssrLoadModule(VIRTUAL_APP_ID)) as Record<string, unknown>;

        const fetchHandler =
          typeof mod.handler === "function"
            ? (mod.handler as (req: Request) => Promise<Response>)
            : typeof mod.taserApp === "object" &&
                mod.taserApp !== null &&
                typeof (mod.taserApp as { fetch?: unknown }).fetch === "function"
              ? ((mod.taserApp as { fetch: (req: Request) => Promise<Response> }).fetch.bind(
                  mod.taserApp,
                ) as (req: Request) => Promise<Response>)
              : typeof mod.default === "object" &&
                  mod.default !== null &&
                  typeof (mod.default as { fetch?: unknown }).fetch === "function"
                ? ((mod.default as { fetch: (req: Request) => Promise<Response> }).fetch.bind(
                    mod.default,
                  ) as (req: Request) => Promise<Response>)
                : undefined;

        if (!fetchHandler) {
          return next();
        }

        cachedNodeHandler = toNodeHandler(fetchHandler) as (
          req: IncomingMessage,
          res: ServerResponse,
        ) => Promise<void>;
      }

      await cachedNodeHandler(req, res);
    } catch (error) {
      server.ssrFixStacktrace(error as Error);
      next(error);
    }
  };
}
