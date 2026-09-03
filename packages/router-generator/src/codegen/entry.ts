import { VIRTUAL_MANIFEST_ID } from "../constants.js";

export type EmitVirtualEntryOptions = {
  taserAppImportPath: string;
  basePath?: string | undefined;
  manifestImportPath?: string | undefined;
};

export function emitVirtualEntrySource(options: EmitVirtualEntryOptions): string {
  const manifestImportPath = options.manifestImportPath ?? VIRTUAL_MANIFEST_ID;
  const configArg =
    options.basePath && options.basePath !== "/" && options.basePath !== ""
      ? `, { basePath: "${options.basePath}" }`
      : "";

  return [
    `import taser from "${options.taserAppImportPath}";`,
    `import { routeManifest } from "${manifestImportPath}";`,
    "",
    `export const app = taser.create(routeManifest${configArg});`,
    "export default app;",
    "",
  ].join("\n");
}
