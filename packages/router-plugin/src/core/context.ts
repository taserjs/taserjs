import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "pathe";
import {
  AnalysisCache,
  emitManifestSource,
  emitVirtualEntrySource,
  resolveRoutesDir,
  resolveServerDir,
  resolveServerEntry,
  scanAndBuildModel,
  taserConfigSchema,
  watchRoutes,
  writeTaserTypes,
  DEFAULT_ENTRY,
  type TypeWriterState,
  type GeneratedModel,
} from "@taserjs/router-generator";

import { ROUTES_ALIAS_ID } from "./constants.js";
import type { TaserPluginOptions, TaserVirtualContext, WatcherOptions } from "./types.js";

function resolveTaserEntryPath(
  rootDir: string,
  serverDir: string,
  entry?: string,
): string | undefined {
  if (entry && !entry.startsWith("#")) {
    const candidate = isAbsolute(entry) ? entry : resolve(serverDir, entry);
    if (existsSync(candidate)) return resolve(candidate);
    const rootCandidate = resolve(rootDir, entry);
    if (existsSync(rootCandidate)) return resolve(rootCandidate);
  }
  const defaultCandidate = join(serverDir, "taser.ts");
  if (existsSync(defaultCandidate)) {
    return resolve(defaultCandidate);
  }
  const rootSrcCandidate = join(rootDir, "src", "taser.ts");
  if (existsSync(rootSrcCandidate)) {
    return resolve(rootSrcCandidate);
  }
  return undefined;
}

export function createTaserVirtualContext(options: TaserPluginOptions = {}): TaserVirtualContext {
  const rootDir = resolve(options.rootDir || ".");
  const resolved = taserConfigSchema.parse(options);
  const serverDir = resolveServerDir(rootDir, resolved.serverDir);
  const routesDir = resolveRoutesDir(rootDir, serverDir, resolved.routesDir);
  const serverEntryPath = resolveServerEntry(rootDir, serverDir, resolved.serverEntry);
  const taserEntryPath = resolveTaserEntryPath(rootDir, serverDir, resolved.entry);

  const cache = new AnalysisCache();
  const writerState: TypeWriterState = {};

  let modelPromise: Promise<GeneratedModel> | null = null;
  let manifestCodePromise: Promise<string> | null = null;
  let entryCodePromise: Promise<string> | null = null;

  const invalidate = () => {
    modelPromise = null;
    manifestCodePromise = null;
    entryCodePromise = null;
  };

  const getModel = (): Promise<GeneratedModel> => {
    if (!modelPromise) {
      modelPromise = scanAndBuildModel({
        routesDir,
        routesImportBase: ROUTES_ALIAS_ID,
        extension: resolved.formatting.extension,
        cache,
        ignore: resolved.ignore,
      });
    }
    return modelPromise;
  };

  const getManifestCode = async (): Promise<string> => {
    if (!manifestCodePromise) {
      manifestCodePromise = (async () => {
        const model = await getModel();
        return emitManifestSource(model, {
          kind: "virtual",
          header: resolved.formatting.header,
          quotes: resolved.formatting.quotes,
        });
      })();
    }
    return manifestCodePromise;
  };

  const getEntryCode = async (): Promise<string> => {
    if (!entryCodePromise) {
      entryCodePromise = (async () => {
        const importPath = taserEntryPath || resolved.entry || DEFAULT_ENTRY;
        return emitVirtualEntrySource({
          taserAppImportPath: importPath,
          basePath: resolved.basePath,
        });
      })();
    }
    return entryCodePromise;
  };

  const writeTypes = async (): Promise<boolean> => {
    const model = await getModel();
    return writeTaserTypes(model, {
      rootDir,
      quotes: resolved.formatting.quotes,
      header: resolved.formatting.header,
      routesDir,
      taserEntryPath,
      state: writerState,
    });
  };

  return {
    rootDir,
    serverDir,
    routesDir,
    serverEntryPath,
    taserEntryPath,
    basePath: resolved.basePath,
    ignore: resolved.ignore,
    entry: resolved.entry,
    formatting: resolved.formatting,
    options: resolved,
    analysisCache: cache,
    writeTypes,
    getManifestCode,
    getEntryCode,
    getModel,
    invalidate,
  };
}

export function watchAndSyncRoutes(
  ctx: TaserVirtualContext,
  onUpdate?: () => Promise<void> | void,
  watcherOptions?: WatcherOptions,
): { close: () => Promise<void> } {
  return watchRoutes(
    {
      routesDir: ctx.routesDir,
      entry: ctx.entry,
      ignore: ctx.ignore,
      debounceMs: watcherOptions?.debounceMs,
      autoScaffold: watcherOptions?.autoScaffold,
    },
    async () => {
      ctx.invalidate();
      try {
        await ctx.writeTypes();
      } catch (error) {
        console.warn("[taser] failed to sync ambient types:", error);
      }
      await onUpdate?.();
    },
  );
}
