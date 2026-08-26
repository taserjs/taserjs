import { VIRTUAL_ENTRY_ID } from "./constants.js";

const HOST_RESOLUTION_CODE = `
const __hostExport = hostServer.default ?? hostServer;
const __toFetchHandler = async (handler) => (await import("srvx/node")).toFetchHandler(handler);
let hostFetch;
if (__hostExport !== null && __hostExport !== undefined) {
  if (typeof __hostExport.fetch === "function") {
    hostFetch = __hostExport.fetch.bind(__hostExport);
  } else if (typeof __hostExport.node === "function") {
    const __raw = __hostExport.node;
    hostFetch =
      __raw.length >= 2
        ? async (req) => (await __toFetchHandler(__raw))(req)
        : __raw;
  } else if (typeof __hostExport === "function" && __hostExport.length >= 2) {
    hostFetch = await __toFetchHandler(__hostExport);
  } else if (typeof __hostExport === "function") {
    hostFetch = __hostExport;
  }
}
`;

export type ComposedAppOptions = {
  serverEntrySpecifier?: string | undefined;
  entrySpecifier?: string | undefined;
  scope?: string | undefined;
  composeStyle?: "standalone" | "hosted" | undefined;
};

export function getComposedAppCode(options: ComposedAppOptions = {}): string {
  const entrySpecifier = options.entrySpecifier || VIRTUAL_ENTRY_ID;
  const hostSpecifier = options.serverEntrySpecifier;
  const rawScope = options.scope;
  const isHosted = options.composeStyle === "hosted";

  const normalizedScope =
    rawScope && rawScope !== "/"
      ? rawScope.startsWith("/")
        ? rawScope.replace(/\/+$/, "")
        : `/${rawScope.replace(/\/+$/, "")}`
      : undefined;

  const nitroInterop = isHosted
    ? ""
    : `
export function createNitroApp() {
  return {
    fetch: handler,
    captureError: (error) => console.error(error),
    hooks: undefined,
  };
}

export function initNitroPlugins(app) {
  return app;
}
`;

  if (!hostSpecifier) {
    if (!normalizedScope) {
      return `import taserRoutesApp from "${entrySpecifier}";

export const handler = async (req) => {
  const response = await taserRoutesApp.fetch(req);
  return response ?? new Response("Not Found", { status: 404 });
};
${nitroInterop}
export const taserApp = { fetch: handler };
export const app = taserApp;
export default taserApp;
`;
    }

    return `import taserRoutesApp from "${entrySpecifier}";

const __scope = "${normalizedScope}";
const __matchesScope = (pathname) => pathname === __scope || pathname.startsWith(__scope + "/");

export const handler = async (req) => {
  const url = new URL(req.url);
  if (!__matchesScope(url.pathname)) {
    return new Response("Not Found", { status: 404 });
  }
  const response = await taserRoutesApp.fetch(req);
  return response ?? new Response("Not Found", { status: 404 });
};
${nitroInterop}
export const taserApp = { fetch: handler };
export const app = taserApp;
export default taserApp;
`;
  }

  const scopeGuard = normalizedScope
    ? `const __scope = "${normalizedScope}";
const __matchesScope = (pathname) => pathname === __scope || pathname.startsWith(__scope + "/");`
    : "";

  const dispatchLogic = normalizedScope
    ? `const url = new URL(req.url);
  if (__matchesScope(url.pathname)) {
    const response = await taserRoutesApp.fetch(req);
    if (response && response.status !== 404) {
      return response;
    }
  }
  if (hostFetch) {
    return await hostFetch(req);
  }
  return new Response("Not Found", { status: 404 });`
    : `const response = await taserRoutesApp.fetch(req);
  if (response && response.status !== 404) {
    return response;
  }
  if (hostFetch) {
    return await hostFetch(req);
  }
  return response ?? new Response("Not Found", { status: 404 });`;

  return `import taserRoutesApp from "${entrySpecifier}";
import * as hostServer from "${hostSpecifier}";

${HOST_RESOLUTION_CODE}
${scopeGuard}

export const handler = async (req) => {
  ${dispatchLogic}
};
${nitroInterop}
export const taserApp = { fetch: handler };
export const app = taserApp;
export default taserApp;
`;
}

export function getServeShimCode(): string {
  return `import { serve } from "srvx/node";
import app from "#taserjs/virtual/app";

serve(app);
`;
}
