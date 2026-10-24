import { mkdirSync, writeFileSync } from "node:fs";

import { formatRelativeImport } from "@taserjs/cli";
import { dirname } from "pathe";

import type { HostServerInfo, HostType } from "./host.js";

/** A host server as the generated entry imports it. */
export interface HostImport {
  type: HostType;
  specifier: string;
}

// pathe.normalize would drop the leading "./" that keeps an import relative.
const toPosix = (path: string) => path.replaceAll("\\", "/");

const MOUNT_IMPORTS: Record<HostType, { name: string; from: string }> = {
  node: { name: "mountNodeHost", from: "@taserjs/runtime/serve/node" },
  fetch: { name: "mountFetchHost", from: "@taserjs/runtime/serve" },
};

interface EntryParts {
  routesImport: string;
  host?: HostImport | undefined;
  imports?: string[];
  body: string;
}

/** Every generated entry shares this skeleton: import the app, optionally mount the host, run `body`. */
function renderEntry({ routesImport, host, imports = [], body }: EntryParts): string {
  const hostLines = host
    ? [
        `import { ${MOUNT_IMPORTS[host.type].name} } from "${MOUNT_IMPORTS[host.type].from}";`,
        `import hostEntry from "${toPosix(host.specifier)}";`,
      ]
    : [];
  const mountLine = host ? [`${MOUNT_IMPORTS[host.type].name}(taserApp, hostEntry);`, ""] : [];

  return [
    "// @ts-nocheck",
    ...imports,
    `import { app as taserApp } from "${toPosix(routesImport)}";`,
    ...hostLines,
    "",
    ...mountLine,
    body,
    "",
  ].join("\n");
}

const FAST_RESPONSE_IMPORT = 'import { FastResponse } from "@taserjs/runtime/serve";';

export function serveShimSource(routesImport: string, host?: HostImport): string {
  return renderEntry({
    routesImport,
    host,
    imports: ['import { FastResponse, serve } from "@taserjs/runtime/serve";'],
    body: "globalThis.Response = FastResponse;\n\nexport { taserApp as app };\nserve(taserApp);",
  });
}

export function nitroStandaloneAppSource(routesImport: string, host?: HostImport): string {
  return renderEntry({
    routesImport,
    host,
    imports: [FAST_RESPONSE_IMPORT],
    body: `globalThis.Response = FastResponse;

export const handler = (req, ...args) => taserApp.fetch(req, ...args);

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

export const app = taserApp;
export default app;`,
  });
}

export function nitroHandlerSource(routesImport: string, host?: HostImport): string {
  return renderEntry({
    routesImport,
    host,
    body: "export default (event) => taserApp.fetch(event.req);",
  });
}

export const NITRO_ROUTING_STUB_SOURCE = [
  "export const findRouteRules = () => ({});",
  "export const findRoute = () => undefined;",
  "export const globalMiddleware = [];",
  "export const findRoutedMiddleware = () => [];",
].join("\n");

/** Host imports inside the output directory are relative so the shim stays relocatable. */
export function relativeHostImport(
  host: HostServerInfo | null,
  fromDir: string,
  importExt: string,
): HostImport | undefined {
  return host
    ? { type: host.type, specifier: formatRelativeImport(fromDir, host.path, importExt) }
    : undefined;
}

export function absoluteHostImport(host: HostServerInfo | null): HostImport | undefined {
  return host ? { type: host.type, specifier: host.path } : undefined;
}

export function emitServeShim(shimPath: string, routesImport: string, host?: HostImport): void {
  mkdirSync(dirname(shimPath), { recursive: true });
  writeFileSync(shimPath, serveShimSource(routesImport, host), "utf-8");
}
