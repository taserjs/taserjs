import { VIRTUAL_ENTRY_ID } from "./constants.js";
import { normalizeScope } from "@taserjs/router-utils";

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

  const normalizedScope = normalizeScope(rawScope);

  const imports = [
    `import taserRoutesApp from "${entrySpecifier}";`,
    hostSpecifier ? `import * as hostServer from "${hostSpecifier}";` : "",
    `import { createComposedHandler } from "@taserjs/router-plugin/runtime";`,
  ]
    .filter(Boolean)
    .join("\n");

  const fastResponseSetup = isHosted
    ? ""
    : `import { FastResponse } from "srvx";
globalThis.Response = FastResponse;`;

  const handlerSetup = `export const handler = createComposedHandler({
  taserRoutesApp,${hostSpecifier ? "\n  hostServer," : ""}${normalizedScope ? `\n  scope: "${normalizedScope}",` : ""}
});`;

  const nitroInterop = isHosted
    ? ""
    : `
// Nitro standalone mode replaces the engine via #nitro/virtual/app; these satisfy Nitro's app contract.
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
    "// @ts-nocheck",
    imports,
    fastResponseSetup,
    handlerSetup,
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
