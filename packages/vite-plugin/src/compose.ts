import { existsSync } from "node:fs";
import { resolve } from "pathe";

/** Candidate locations for the user's host server entry (default export). */
const HOST_SERVER_ENTRY_CANDIDATES = [
  "src/server.node.ts",
  "src/server.node.js",
  "server.node.ts",
  "server.node.js",
  "src/server.ts",
  "src/server.js",
  "src/server.mjs",
  "server.ts",
  "server.js",
  "server.mjs",
];

export function findHostServerEntry(rootDir: string): string | undefined {
  for (const candidate of HOST_SERVER_ENTRY_CANDIDATES) {
    const fullPath = resolve(rootDir, candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

/**
 * Codegen for `#taserjs/virtual/app`: composes the taser route handler with an
 * optional user-provided host server (default export of server.ts).
 *
 * Dispatch order: taser routes (pass-through on miss) → host fetch → 404.
 * The default export is srvx-compatible ({ fetch }), so the same composition
 * runs under the dev server and the production serve shim.
 *
 * Matches the Nitro workflow by installing srvx's FastResponse as the global
 * Response before any route/reply code constructs responses, so manual apps
 * get the same hot-path behavior as Nitro deployments.
 */
export function getComposedAppCode(options: {
  rootDir: string;
  scope?: string | undefined;
}): string {
  const hostServer = findHostServerEntry(options.rootDir);

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

export default { fetch: handler };
`;
}

/**
 * Codegen for the production SSR entry shim written to `.taser/serve.mjs`.
 * Bundled by `vite build`; starting the output boots an srvx server that
 * dispatches into the composed app.
 */
export function getServeShimCode(): string {
  return `import { serve } from "srvx";
import app from "#taserjs/virtual/app";

const port = Number(process.env.PORT) || 3000;

serve({
  fetch: (req) => app.fetch(req),
  port,
});

console.log("taser server listening on http://localhost:" + port);
`;
}
