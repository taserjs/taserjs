export { FastResponse, serve } from "srvx";

/** The slice of a Hono-style app that a host server is mounted onto. */
export interface HostMountTarget {
  all(
    path: string,
    handler: (context: { req: { raw: Request } }) => Response | Promise<Response>,
  ): unknown;
}

/**
 * Forwards every request the app does not match to a fetch-style host server
 * (an object with `fetch`, or a bare fetch function).
 */
export function mountFetchHost(app: HostMountTarget, hostModule: unknown): void {
  const host = (hostModule as { default?: unknown } | undefined)?.default ?? hostModule;
  const fetchHost =
    typeof (host as { fetch?: unknown } | undefined)?.fetch === "function"
      ? (request: Request) => (host as { fetch: (request: Request) => Response }).fetch(request)
      : typeof host === "function"
        ? (host as (request: Request) => Response | Promise<Response>)
        : undefined;

  if (fetchHost) app.all("*", (context) => fetchHost(context.req.raw));
}
