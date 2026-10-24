import { toFetchHandler } from "srvx/node";

import { mountFetchHost, type HostMountTarget } from "./serve.js";

export { toFetchHandler, toNodeHandler } from "srvx/node";

type NodeRequestListener = Parameters<typeof toFetchHandler>[0];

/**
 * Forwards every request the app does not match to a Node-style host server
 * (a request listener, or an object exposing one as `routing`, like Fastify).
 */
export function mountNodeHost(app: HostMountTarget, hostModule: unknown): void {
  const host = (hostModule as { default?: unknown } | undefined)?.default ?? hostModule;
  const listener = typeof host === "function" ? host : (host as { routing?: unknown })?.routing;

  if (typeof listener === "function") {
    mountFetchHost(app, toFetchHandler(listener as NodeRequestListener));
  }
}
