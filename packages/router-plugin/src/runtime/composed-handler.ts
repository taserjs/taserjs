export type HostExport =
  | {
      fetch?: (req: Request) => Promise<Response | undefined> | Response | undefined;
      default?: unknown;
      [key: string]: unknown;
    }
  | ((...args: any[]) => any)
  | null
  | undefined;

export interface TaserRoutesApp {
  fetch(req: Request): Promise<Response | undefined> | Response | undefined;
}

export interface ComposedHandlerOptions {
  taserRoutesApp: TaserRoutesApp;
  hostServer?: unknown;
  scope?: string | undefined;
  fallbackTo404?: boolean | undefined;
}

export function extractPathname(url: string): string {
  const queryIdx = url.indexOf("?");
  const path = queryIdx === -1 ? url : url.slice(0, queryIdx);
  const protoIdx = path.indexOf("://");
  if (protoIdx === -1) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  const slashIdx = path.indexOf("/", protoIdx + 3);
  return slashIdx === -1 ? "/" : path.slice(slashIdx);
}

export function normalizeScope(scope: string | undefined): string | undefined {
  if (!scope || scope === "/") {
    return undefined;
  }
  return scope.startsWith("/") ? scope.replace(/\/+$/, "") : `/${scope.replace(/\/+$/, "")}`;
}

export function matchesScope(pathname: string, normalizedScope: string): boolean {
  return pathname === normalizedScope || pathname.startsWith(`${normalizedScope}/`);
}

export async function resolveHostFetch(
  hostServer: unknown,
): Promise<((req: Request) => Promise<Response | undefined> | Response | undefined) | null> {
  const host = (hostServer as { default?: unknown })?.default ?? hostServer;

  if (host === null || host === undefined) {
    return null;
  }

  const hostObj = host as Record<string, unknown>;

  if (typeof hostObj.fetch === "function") {
    return (hostObj.fetch as (req: Request) => Promise<Response>).bind(hostObj);
  }

  if (typeof host === "function") {
    if (host.length >= 2) {
      const { toFetchHandler } = await import("srvx/node");
      return toFetchHandler(host as any);
    }
    return host as (req: Request) => Promise<Response>;
  }

  return null;
}

export function createComposedHandler(
  options: ComposedHandlerOptions,
): (req: Request) => Promise<Response> {
  const { taserRoutesApp, hostServer, fallbackTo404 = true } = options;
  const normalizedScope = normalizeScope(options.scope);

  // Fast-path: When there is no host server at all, only Taser handles requests
  if (!hostServer) {
    if (!normalizedScope) {
      return async (req: Request): Promise<Response> => {
        const response = await taserRoutesApp.fetch(req);
        if (response !== undefined && response !== null) {
          return response;
        }
        return fallbackTo404
          ? new Response("Not Found", { status: 404 })
          : (undefined as unknown as Response);
      };
    }

    return async (req: Request): Promise<Response> => {
      const pathname = extractPathname(req.url);
      if (matchesScope(pathname, normalizedScope)) {
        const response = await taserRoutesApp.fetch(req);
        if (response !== undefined && response !== null) {
          return response;
        }
      }
      return fallbackTo404
        ? new Response("Not Found", { status: 404 })
        : (undefined as unknown as Response);
    };
  }

  let cachedHostFetch:
    | ((req: Request) => Promise<Response | undefined> | Response | undefined)
    | null
    | undefined;

  const getHostFetch = async () => {
    if (cachedHostFetch !== undefined) {
      return cachedHostFetch;
    }
    cachedHostFetch = await resolveHostFetch(hostServer);
    return cachedHostFetch;
  };

  // Taser always takes priority over the host server
  return async (req: Request): Promise<Response> => {
    const pathname = extractPathname(req.url);
    const inScope = normalizedScope ? matchesScope(pathname, normalizedScope) : true;

    if (inScope) {
      const taserResponse = await taserRoutesApp.fetch(req);
      if (taserResponse !== undefined && taserResponse !== null) {
        return taserResponse;
      }
    }

    const hostFetch = await getHostFetch();
    if (hostFetch) {
      const hostResponse = await hostFetch(req);
      if (hostResponse !== undefined && hostResponse !== null) {
        return hostResponse;
      }
    }

    if (fallbackTo404) {
      return new Response("Not Found", { status: 404 });
    }
    return undefined as unknown as Response;
  };
}
