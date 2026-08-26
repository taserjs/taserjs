import { VIRTUAL_ENTRY_ID } from "./constants.js";

const HOST_RESOLUTION_CODE = `
const __hostExport = hostServer.default ?? hostServer;
let __cachedHostFetch;

async function getHostFetch() {
  if (__cachedHostFetch !== undefined) {
    return __cachedHostFetch;
  }
  if (__hostExport === null || __hostExport === undefined) {
    __cachedHostFetch = null;
    return null;
  }
  if (typeof __hostExport.fetch === "function") {
    __cachedHostFetch = __hostExport.fetch.bind(__hostExport);
    return __cachedHostFetch;
  }
  if (typeof __hostExport.node === "function") {
    const raw = __hostExport.node;
    if (raw.length >= 2) {
      const { toFetchHandler } = await import("srvx/node");
      __cachedHostFetch = toFetchHandler(raw);
    } else {
      __cachedHostFetch = raw;
    }
    return __cachedHostFetch;
  }
  if (typeof __hostExport === "function" && __hostExport.length >= 2) {
    const { toFetchHandler } = await import("srvx/node");
    __cachedHostFetch = toFetchHandler(__hostExport);
    return __cachedHostFetch;
  }
  if (typeof __hostExport === "function") {
    __cachedHostFetch = __hostExport;
    return __cachedHostFetch;
  }
  __cachedHostFetch = null;
  return null;
}
`;

export type ComposedAppOptions = {
  serverEntrySpecifier?: string | undefined;
  entrySpecifier?: string | undefined;
  scope?: string | undefined;
  composeStyle?: "standalone" | "hosted" | undefined;
};

function hostFallbackBlock(hasHost: boolean): string {
  if (!hasHost) {
    return "";
  }
  return `  const hostFetch = await getHostFetch();
  if (hostFetch) {
    const hostResponse = await hostFetch(req);
    if (hostResponse !== undefined && hostResponse !== null) {
      return hostResponse;
    }
  }`;
}

function taserDispatchBlock(scoped: boolean): string {
  if (scoped) {
    return `  const url = new URL(req.url);
  if (__matchesScope(url.pathname)) {
    const response = await taserRoutesApp.fetch(req);
    if (response !== undefined && response !== null) {
      return response;
    }
  }`;
  }
  return `  const response = await taserRoutesApp.fetch(req);
  if (response !== undefined && response !== null) {
    return response;
  }`;
}

function buildDispatchLogic(scoped: boolean, hasHost: boolean): string {
  const parts = [taserDispatchBlock(scoped), hostFallbackBlock(hasHost), `  return new Response("Not Found", { status: 404 });`];
  return parts.filter(Boolean).join("\n");
}

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

  const imports = [
    `import taserRoutesApp from "${entrySpecifier}";`,
    hostSpecifier ? `import * as hostServer from "${hostSpecifier}";` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const hostHelper = hostSpecifier ? HOST_RESOLUTION_CODE.trim() : "";

  const scopeDefinition = normalizedScope
    ? `const __scope = "${normalizedScope}";
const __matchesScope = (pathname) => pathname === __scope || pathname.startsWith(__scope + "/");`
    : "";

  const dispatchLogic = buildDispatchLogic(Boolean(normalizedScope), Boolean(hostSpecifier));

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

  const sections = [
    imports,
    hostHelper,
    scopeDefinition,
    `export const handler = async (req) => {\n${dispatchLogic}\n};`,
    nitroInterop.trim(),
    `export const taserApp = { fetch: handler };
export const app = taserApp;
export default taserApp;`,
  ].filter(Boolean);

  return `${sections.join("\n\n")}\n`;
}

export function getServeShimCode(): string {
  return `import { serve } from "srvx/node";
import app from "#taserjs/virtual/app";

serve(app);
`;
}
