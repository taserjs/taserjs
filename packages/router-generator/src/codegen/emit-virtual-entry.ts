export type EmitVirtualEntryOptions = {
  taserAppImportPath: string;
};

export function emitVirtualEntrySource(options: EmitVirtualEntryOptions): string {
  return `import { t } from "${options.taserAppImportPath}";
import { routeManifest } from "#taserjs/virtual/manifest";
import { createNitroRouteHandler } from "@taserjs/router";

export const app = t.create(routeManifest);
export default createNitroRouteHandler(app);
`;
}
