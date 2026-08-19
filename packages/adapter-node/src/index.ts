import type { Server, IncomingMessage, ServerResponse, RequestListener } from "node:http";

import { getRequestListener } from "@hono/node-server";
import type { TaserApp, TaserHandler } from "@taserjs/router";
import { resolveMountBase } from "@taserjs/router-utils";

export type NodeNativeContext = { req: IncomingMessage; res: ServerResponse };

const mountedServers = new WeakSet<Server>();

function parsePathname(url: string | undefined): string {
  if (!url) {
    return "/";
  }
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    const queryIndex = url.indexOf("?");
    return queryIndex === -1 ? url : url.slice(0, queryIndex);
  }
}

function matchesMountPathname(pathname: string, mountBase: string): boolean {
  if (mountBase === "/") {
    return true;
  }
  return pathname === mountBase || pathname.startsWith(`${mountBase}/`);
}

function createMountedListener(taserApp: TaserApp, pattern: string): RequestListener {
  resolveMountBase(pattern);

  return async (req, res) => {
    const fetcher = taserApp.native({ req, res });
    await getRequestListener((request) => fetcher.fetch(request))(req, res);
  };
}

export function createNodeHandler(taserApp: TaserApp): TaserHandler<Server> & {
  requestListener(pattern: string): RequestListener;
} {
  return {
    requestListener(pattern: string): RequestListener {
      return createMountedListener(taserApp, pattern);
    },

    mount(pattern: string, server: Server): void {
      if (mountedServers.has(server)) {
        throw new Error("createNodeHandler().mount() was already called on this server");
      }
      mountedServers.add(server);

      const mountBase = resolveMountBase(pattern);
      const listener = createMountedListener(taserApp, pattern);

      server.on("request", (req, res) => {
        const pathname = parsePathname(req.url);
        if (matchesMountPathname(pathname, mountBase)) {
          listener(req, res);
        }
      });
    },
  };
}

declare module "@taserjs/router" {
  interface RouterRegister {
    NativeContext: NodeNativeContext;
  }
}
