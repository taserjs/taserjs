/**
 * Codegen for `#taserjs/virtual/app`: composes the taser route handler with an
 * optional user-provided host server (e.g. server.ts).
 *
 * Dispatch order: taser routes (pass-through on miss) → host fetch → 404.
 * Installs srvx's FastResponse as global Response before any route code runs.
 *
 * Error contract (standalone mode): thrown errors propagate to the Nitro/srvx
 * error boundary; `captureError` logs via console.error and does not swallow
 * or transform responses. Structured reporters can replace this in future
 * without changing dispatch semantics.
 */
export function getComposedAppCode(options: {
  /** Import specifier for the optional host server entry (alias, not a path). */
  serverEntrySpecifier?: string | undefined;
  scope?: string | undefined;
}): string {
  const hostServer = options.serverEntrySpecifier;

  const cleanScope =
    !options.scope || options.scope === "/" ? "" : options.scope.replace(/\/+$/, "");
  const scopeCondition =
    cleanScope === ""
      ? "true"
      : `url.pathname === "${cleanScope}" || url.pathname.startsWith("${cleanScope}/")`;

  const imports = [
    `import taserEntry from "#taserjs/virtual/entry";`,
    `import { FastResponse } from "srvx";`,
    `globalThis.Response = FastResponse;`,
  ];
  let hostInvocation = "";

  if (hostServer) {
    imports.push(`import hostServer from "${hostServer}";`);
    hostInvocation = `
    const hostFetch = typeof hostServer === "function"
      ? hostServer
      : hostServer?.fetch || hostServer?.default?.fetch || hostServer?.default;
    if (typeof hostFetch === "function") {
      const res = await hostFetch(req);
      if (res !== undefined) return res;
    }
`;
  }

  return `${imports.join("\n")}

export async function handler(req) {
  const url = new URL(req.url);
  if (${scopeCondition}) {
    const res = await taserEntry(req);
    if (res !== undefined) {
      return res;
    }
  }
${hostInvocation}
  return new FastResponse(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

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

export default { fetch: handler };
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
