import { existsSync } from "node:fs";
import { resolve } from "pathe";
import {
  AnalysisCache,
  scanAndBuildModel,
  emitVirtualManifestSource,
  emitVirtualEntrySource,
  taserOptionsSchema,
  DEFAULT_IGNORE,
  type GeneratedModel,
} from "@taserjs/router-generator";
import type { TaserPluginOptions, TaserVirtualContext } from "./types.js";
import { writeTaserTypes } from "./writer.js";

export const VIRTUAL_MANIFEST_ID = "#taserjs/virtual/manifest";
export const RESOLVED_VIRTUAL_MANIFEST_ID = "\0" + VIRTUAL_MANIFEST_ID;

export const VIRTUAL_ENTRY_ID = "#taserjs/virtual/entry";
export const RESOLVED_VIRTUAL_ENTRY_ID = "\0" + VIRTUAL_ENTRY_ID;

export function resolveTaserAppPath(rootDir: string, entry: string): string {
  const relativeCandidate = entry.replace(/^#src\//, "src/");
  const directPath = resolve(rootDir, relativeCandidate);
  if (existsSync(directPath)) {
    return directPath;
  }

  // Probe without extension or with .ts / .js
  const withoutExt = directPath.replace(/\.[cm]?[jt]sx?$/, "");
  const extensions = [".ts", ".js", ".tsx", ".jsx", ".mts", ".mjs"];
  for (const ext of extensions) {
    const candidate = `${withoutExt}${ext}`;
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback defaults
  const fallbackCandidates = [
    resolve(rootDir, "src/taser.ts"),
    resolve(rootDir, "src/taser.js"),
    resolve(rootDir, "taser.ts"),
    resolve(rootDir, "taser.js"),
  ];
  for (const candidate of fallbackCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return resolve(rootDir, "src/taser.ts");
}

export function resolveRoutesDir(rootDir: string, explicitPath?: string): string {
  if (explicitPath) {
    return resolve(rootDir, explicitPath);
  }
  const srcRoutes = resolve(rootDir, "src/routes");
  if (existsSync(srcRoutes)) {
    return srcRoutes;
  }
  const rootRoutes = resolve(rootDir, "routes");
  if (existsSync(rootRoutes)) {
    return rootRoutes;
  }
  return srcRoutes;
}

export function createTaserVirtualContext(options: TaserPluginOptions = {}): TaserVirtualContext {
  const rootDir = resolve(options.rootDir || ".");
  const routesDir = resolveRoutesDir(rootDir, options.routesDir);
  const parsedOptions = taserOptionsSchema.parse(options);
  const ignore = options.ignore && options.ignore.length > 0 ? options.ignore : [...DEFAULT_IGNORE];
  const taserAppPath = resolveTaserAppPath(rootDir, parsedOptions.entry);

  let cachedModel: GeneratedModel | undefined;
  let cachedManifestCode: string | undefined;
  let cachedEntryCode: string | undefined;
  const analysisCache = new AnalysisCache();

  async function getModel(): Promise<GeneratedModel> {
    if (cachedModel) {
      return cachedModel;
    }
    // Pure read path: the stat-keyed analysis cache makes rebuilds after a
    // single file change re-parse only that file; scaffolding is deliberately
    // not performed here (watcher "add" and `taser generate` own it).
    cachedModel = await scanAndBuildModel({
      routesDir,
      routesImportBase: routesDir,
      extension: parsedOptions.extension,
      validate: parsedOptions.validate,
      cache: analysisCache,
      ignore,
    });
    return cachedModel;
  }

  function invalidate() {
    cachedModel = undefined;
    cachedManifestCode = undefined;
    cachedEntryCode = undefined;
  }

  async function getManifestCode(): Promise<string> {
    if (cachedManifestCode) {
      return cachedManifestCode;
    }
    const model = await getModel();
    cachedManifestCode = emitVirtualManifestSource(model, {
      header: parsedOptions.header,
      footer: [],
      quotes: parsedOptions.quotes,
    });
    return cachedManifestCode;
  }

  async function getEntryCode(): Promise<string> {
    if (cachedEntryCode) {
      return cachedEntryCode;
    }
    cachedEntryCode = emitVirtualEntrySource({
      taserAppImportPath: taserAppPath,
      ...(options.basePath !== undefined ? { basePath: options.basePath } : {}),
    });
    return cachedEntryCode;
  }

  async function writeTypes(): Promise<boolean> {
    const model = await getModel();
    return writeTaserTypes(model, {
      rootDir,
      quotes: parsedOptions.quotes,
      header: parsedOptions.header,
    });
  }

  return {
    rootDir,
    routesDir,
    ignore,
    options: parsedOptions,
    analysisCache,
    getManifestCode,
    getEntryCode,
    invalidate,
    writeTypes,
  };
}
