import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { emitTypeDeclarationsSource } from "./types.js";
import { DEFAULT_MANIFEST_HEADER } from "../constants.js";
import { toPosixPath } from "../support/paths.js";
import type { GeneratedModel } from "../types.js";

const DEFAULT_ROUTES_ALIAS = "#taserjs/routes";

export type TypeWriterState = {
  lastSignature?: string | undefined;
};

export type WriteTypesOptions = {
  rootDir?: string | undefined;
  quotes?: "single" | "double" | undefined;
  header?: string[] | undefined;
  routesDir?: string | undefined;
  routesImportBase?: string | undefined;
  state?: TypeWriterState | undefined;
};

export async function writeTaserTypes(
  model: GeneratedModel,
  options: WriteTypesOptions = {},
): Promise<boolean> {
  const rootDir = resolve(options.rootDir || process.cwd());
  const typesDir = resolve(rootDir, ".taser/types");
  const targetFile = join(typesDir, "routes.d.ts");

  const header = options.header ?? [...DEFAULT_MANIFEST_HEADER];
  const aliasBase = options.routesImportBase ?? DEFAULT_ROUTES_ALIAS;

  let rewriteImportPath: ((spec: string) => string) | undefined;
  if (options.routesDir) {
    const routesDir = resolve(options.routesDir);
    const aliasPrefix = `${aliasBase}/`;
    rewriteImportPath = (spec) => {
      const targetAbs = spec.startsWith(aliasPrefix)
        ? join(routesDir, spec.slice(aliasPrefix.length))
        : resolve(spec);
      const rel = toPosixPath(relative(typesDir, targetAbs));
      return rel.startsWith("./") || rel.startsWith("../") ? rel : `./${rel}`;
    };
  }

  const code = emitTypeDeclarationsSource(model, {
    header,
    quotes: options.quotes ?? "double",
    rewriteImportPath,
  });

  if (options.state && options.state.lastSignature === code) {
    return false;
  }

  await mkdir(typesDir, { recursive: true });
  await writeFile(targetFile, code, "utf8");

  if (options.state) {
    options.state.lastSignature = code;
  }

  return true;
}
