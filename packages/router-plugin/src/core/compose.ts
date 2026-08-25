/**
 * Codegen for the composed Taser app module.
 *
 * - `standalone` (default): full runner for Nitro/srvx hosts — installs srvx's
 *   FastResponse as global Response, supports optional host-server passthrough,
 *   and emits Nitro interop helpers.
 * - `hosted`: for embedding inside another framework's runtime (e.g. Next route
 *   handlers) — keeps the native global Response untouched, skips Nitro
 *   interop, and only exports a fetch-style handler.
 *
 * Dispatch order: taser routes (pass-through on miss) → host fetch → 404.
 */
/**
 * Host-entry contract, resolved once at module init in generated code. Users
 * simply `export default <handler>` — three shapes are recognized:
 *
 * - object with a `fetch` function — used directly (fetch-native hosts like
 *   Hono). Never touches srvx.
 * - `{ node }` — optional explicit contract for a pre-converted fetch handler
 *   or a raw Node-style handler.
 * - bare callable with arity >= 2 — a Node-style handler (Express app,
 *   Fastify's `app.routing`) wrapped with `srvx/node`'s `toFetchHandler`
 *   via dynamic import, so fetch-native hosts never require srvx.
 *
 * Anything else falls through to Taser's 404. Node-style handlers must manage
 * their own readiness before export (e.g. `await app.ready()`).
 */
const HOST_RESOLUTION_CODE = `
const __hostExport = hostServer.default ?? hostServer;
const __toFetchHandler = async (handler) => (await import("srvx/node")).toFetchHandler(handler);
let hostFetch;
if (__hostExport !== null && __hostExport !== undefined) {
  if (typeof __hostExport.fetch === "function") {
    hostFetch = __hostExport.fetch.bind(__hostExport);
  } else if (typeof __hostExport.node === "function") {
    // Accept both pre-converted fetch handlers and raw Node-style handlers.
    const __raw = __hostExport.node;
    hostFetch =
      __raw.length >= 2
        ? async (req) => (await __toFetchHandler(__raw))(req)
        : __raw;
  } else if (typeof __hostExport === "function" && __hostExport.length >= 2) {
    hostFetch = async (req) => (await __toFetchHandler(__hostExport))(req);
  }
}
`;

export function getComposedAppCode(options: {
  /** Import specifier for the optional host server entry (alias, not a path). */
  serverEntrySpecifier?: string | undefined;
  scope?: string | undefined;
  /** Composition target runtime. Defaults to `"standalone"`. */
  composeStyle?: "standalone" | "hosted" | undefined;
}): string {
  const hosted = options.composeStyle === "hosted";
  const hostServer = options.serverEntrySpecifier;

  const cleanScope =
    !options.scope || options.scope === "/" ? "" : options.scope.replace(/\/+$/, "");
  const scopeCondition =
    cleanScope === ""
      ? "true"
      : `url.pathname === "${cleanScope}" || url.pathname.startsWith("${cleanScope}/")`;

  const imports = [
    `import taserEntry from "#taserjs/virtual/entry";`,
    ...(hosted
      ? []
      : [`import { FastResponse } from "srvx";`, `globalThis.Response = FastResponse;`]),
  ];
  let hostModuleCode = "";
  let hostInvocation = "";

  if (hostServer) {
    imports.push(`import * as hostServer from "${hostServer}";`);
    hostModuleCode = `${HOST_RESOLUTION_CODE}
`;
    hostInvocation = `
    if (typeof hostFetch === "function") {
      const res = await hostFetch(req);
      if (res !== undefined) return res;
    }
`;
  }

  const notFound = hosted
    ? `return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });`
    : `return new FastResponse(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });`;

  const nitroInterop = hosted
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

  return `${imports.join("\n")}
${hostModuleCode}
export async function handler(req) {
  const url = new URL(req.url);
  if (${scopeCondition}) {
    const res = await taserEntry(req);
    if (res !== undefined) {
      return res;
    }
  }
${hostInvocation}
${notFound}
}
${nitroInterop}
export const taserApp = { fetch: handler };
export const app = taserApp;
export default taserApp;
`;
}

/**
 * Codegen for the standalone production SSR entry shim written to `.taser/serve.mjs`.
 */
export function getServeShimCode(): string {
  return `import { serve } from "srvx";
import app from "#taserjs/virtual/app";

const port = Number(process.env.PORT) || 3000;

serve({
  fetch: (req) => app.fetch(req),
  port,
});

console.log("[taser] server listening on http://localhost:" + port);
`;
}
