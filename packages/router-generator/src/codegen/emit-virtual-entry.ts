export type EmitVirtualEntryOptions = {
  taserAppImportPath: string;
  basePath?: string | undefined;
};

/**
 * Emits the virtual entry module. NOTE: the app is constructed eagerly at
 * import time (`export const app = t.create(…)`) — importing this module has
 * the side effect of booting the Taser app from the route manifest. The host
 * integration relies on this for zero-lazy-init request handling.
 */
export function emitVirtualEntrySource(options: EmitVirtualEntryOptions): string {
  const createArgs =
    options.basePath && options.basePath !== "/" && options.basePath !== ""
      ? `routeManifest, { basePath: "${options.basePath}" }`
      : `routeManifest`;

  return `import { t } from "${options.taserAppImportPath}";
import { routeManifest } from "#taserjs/virtual/manifest";
import { createNitroRouteHandler } from "@taserjs/router";

export const app = t.create(${createArgs});
export default createNitroRouteHandler(app);
`;
}
