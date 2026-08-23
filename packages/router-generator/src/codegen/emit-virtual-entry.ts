export type EmitVirtualEntryOptions = {
  taserAppImportPath: string;
  basePath?: string | undefined;
};

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
