import { resolveImportExtension, type ExtensionOption } from "../config/schema.js";

export function toModuleImportPath(
  routesImportPrefix: string,
  routeRel: string,
  extension: ExtensionOption = true,
): string {
  const withoutExtension = routeRel.replace(/\.ts$/, "").replace(/^\//, "");
  const base = `${routesImportPrefix}/${withoutExtension}`;
  const importExtension = resolveImportExtension(extension);
  return importExtension ? `${base}${importExtension}` : base;
}
