import { VIRTUAL_MANIFEST_ID } from "../constants.js";

export type EmitVirtualEntryOptions = {
  taserAppImportPath: string;
  basePath?: string | undefined;
  manifestImportPath?: string | undefined;
};

export function emitVirtualEntrySource(options: EmitVirtualEntryOptions): string {
  const createArgsItems = ['routeManifest']
  if (options.basePath && options.basePath !== "/" && options.basePath !== "") {
    createArgsItems.push(`{ basePath: "${options.basePath}" }`);
  }
  const createArgs = createArgsItems.join(", ");

  const manifestImportPath = options.manifestImportPath ?? VIRTUAL_MANIFEST_ID;

  return `import { t } from "${options.taserAppImportPath}";
import { routeManifest } from "${manifestImportPath}";

export const app = t.create(${createArgs});
export default app;
`;
}
