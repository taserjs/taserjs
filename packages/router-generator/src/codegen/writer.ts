import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { emitTypeDeclarationsSource } from "./types.js";
import { emitVirtualDeclarationsSource } from "./virtual.js";
import {
  DEFAULT_GENERATED_TYPES_DIR,
  DEFAULT_MANIFEST_HEADER,
  DEFAULT_ROUTES_TYPES_FILENAME,
  DEFAULT_VIRTUAL_TYPES_FILENAME,
  ROUTES_ALIAS_ID,
} from "../constants.js";
import { createAliasImportRewriter } from "../support/paths.js";
import type { GeneratedModel } from "../types.js";

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
  const typesDir = resolve(rootDir, DEFAULT_GENERATED_TYPES_DIR);
  const routesTargetFile = join(typesDir, DEFAULT_ROUTES_TYPES_FILENAME);
  const virtualTargetFile = join(typesDir, DEFAULT_VIRTUAL_TYPES_FILENAME);

  const header = options.header ?? [...DEFAULT_MANIFEST_HEADER];
  const aliasBase = options.routesImportBase ?? ROUTES_ALIAS_ID;

  const rewriteImportPath = options.routesDir
    ? createAliasImportRewriter({
        outputDir: typesDir,
        routesDir: resolve(options.routesDir),
        aliasBase,
      })
    : undefined;

  const routesCode = emitTypeDeclarationsSource(model, {
    header,
    quotes: options.quotes ?? "double",
    rewriteImportPath,
  });

  const virtualCode = emitVirtualDeclarationsSource({ header });
  const combinedSignature = `${routesCode}\n---\n${virtualCode}`;

  if (options.state && options.state.lastSignature === combinedSignature) {
    return false;
  }

  await mkdir(typesDir, { recursive: true });
  await Promise.all([
    writeFile(routesTargetFile, routesCode, "utf8"),
    writeFile(virtualTargetFile, virtualCode, "utf8"),
  ]);

  if (options.state) {
    options.state.lastSignature = combinedSignature;
  }

  return true;
}
