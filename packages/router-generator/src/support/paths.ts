import { dirname, relative, sep } from "node:path";

export function toPosixPath(filePath: string): string {
  return filePath.split(sep).join("/");
}

export function routesImportPrefix(routesDir: string, outputFile: string): string {
  const outputDir = dirname(outputFile);
  const relativeRoutes = toPosixPath(relative(outputDir, routesDir));
  if (relativeRoutes === "") {
    return ".";
  }
  return relativeRoutes.startsWith(".") ? relativeRoutes : `./${relativeRoutes}`;
}
