import type { Server, RequestListener } from "node:http";

import { getRequestListener } from "@hono/node-server";
import type { TaserApp, TaserHandler } from "@taserjs/router";
import { resolveMountBase } from "@taserjs/router-utils";

const mountedServers = new WeakSet<Server>();

function parsePathname(url: string | undefined): string {
  if (!url) {
    return "/";
  }
  const qIdx = url.indexOf("?");
  const hIdx = url.indexOf("#");
  const end = qIdx > -1 && hIdx > -1 ? Math.min(qIdx, hIdx) : Math.max(qIdx, hIdx);
  return end === -1 ? url : url.slice(0, end);
}

function matchesMountPathname(pathname: string, mountBase: string): boolean {
  if (mountBase === "/") {
    return true;
  }
  return pathname === mountBase || pathname.startsWith(`${mountBase}/`);
}

function createMountedListener(taserApp: TaserApp, pattern: string): RequestListener {
  resolveMountBase(pattern);

  const listener = getRequestListener((request) => taserApp.fetch(request));

  return async (req, res) => {
    await listener(req, res);
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
