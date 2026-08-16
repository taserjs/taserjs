import type { ExtensionOption } from "../config/schema.js";
import { toModuleImportPath } from "../support/import-path.js";
import { layoutIdFromPath } from "../support/naming.js";
import { normalizeRouteRel } from "./normalize.js";

export function importPathFromRouteRel(
  routeRel: string,
  routesImportPrefix: string,
  extension: ExtensionOption = true,
): string {
  return toModuleImportPath(routesImportPrefix, routeRel, extension);
}

export function importPathFromLayoutId(
  layoutId: string,
  routesImportPrefix: string,
  routeRel: string,
  extension: ExtensionOption = true,
): string {
  if (routeRel === "$.ts") {
    return toModuleImportPath(routesImportPrefix, "$", extension);
  }

  if (routeRel.endsWith("/$.ts")) {
    return toModuleImportPath(routesImportPrefix, `${layoutId.slice(0, -2)}/$`, extension);
  }

  if (routeRel.endsWith(".$.ts")) {
    return toModuleImportPath(routesImportPrefix, `${layoutId.slice(0, -2)}.$`, extension);
  }

  if (routeRel === "__root.ts") {
    return toModuleImportPath(routesImportPrefix, "__root", extension);
  }

  return toModuleImportPath(routesImportPrefix, layoutId, extension);
}

export function layoutImportPathFromRouteRel(
  routeRel: string,
  routesImportPrefix: string,
  extension: ExtensionOption = true,
): string {
  const id = layoutIdFromPath(normalizeRouteRel(routeRel));
  return importPathFromLayoutId(id, routesImportPrefix, routeRel, extension);
}
