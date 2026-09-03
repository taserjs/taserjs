import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "pathe";
import {
  createAliasImportRewriter,
  emitManifestSource,
  emitVirtualEntrySource,
  ensureRelativePrefix,
  ROUTES_ALIAS_ID,
} from "@taserjs/router-generator";
import { getComposedAppCode } from "./compose.js";
import type { TaserVirtualContext } from "./types.js";

import { DISK_ARTIFACT_DIR } from "./constants.js";

export type WriteDiskArtifactsOptions = {
  outDir?: string | undefined;
  scope?: string | undefined;
};

export type WriteDiskArtifactsResult = {
  outDir: string;
  files: string[];
};

async function writeIfChanged(filePath: string, content: string): Promise<boolean> {
  if (existsSync(filePath)) {
    const existing = await readFile(filePath, "utf8");
    if (existing === content) {
      return false;
    }
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return true;
}

export async function writeDiskArtifacts(
  ctx: TaserVirtualContext,
  options: WriteDiskArtifactsOptions = {},
): Promise<WriteDiskArtifactsResult> {
  const rootDir = resolve(ctx.rootDir);
  const outDir = resolve(rootDir, options.outDir || DISK_ARTIFACT_DIR);
  const scope = options.scope ?? ctx.basePath;

  const manifestPath = join(outDir, "manifest.ts");
  const entryPath = join(outDir, "entry.ts");
  const appPath = join(outDir, "app.ts");

  const model = await ctx.getModel();

  const rewriteImportPath = createAliasImportRewriter({
    outputDir: outDir,
    routesDir: ctx.routesDir,
    aliasBase: ROUTES_ALIAS_ID,
    stripImportExtension: true,
  });

  const manifestCode = emitManifestSource(model, {
    kind: "virtual",
    header: ctx.formatting.header,
    quotes: ctx.formatting.quotes,
    rewriteImportPath,
  });

  let taserAppImportPath = ctx.entry;
  if (ctx.taserEntryPath) {
    const relToTaser = relative(outDir, ctx.taserEntryPath).replace(/\.[cm]?[jt]sx?$/, "");
    taserAppImportPath = ensureRelativePrefix(relToTaser);
  }

  const entryCode = emitVirtualEntrySource({
    taserAppImportPath,
    basePath: ctx.basePath,
    manifestImportPath: "./manifest",
  });

  let hostSpecifier: string | undefined;
  if (ctx.serverEntryPath) {
    const relToHost = relative(outDir, ctx.serverEntryPath);
    const hostWithoutExt = relToHost.replace(/\.[cm]?[jt]sx?$/, "");
    hostSpecifier = ensureRelativePrefix(hostWithoutExt);
  }

  const appCode = getComposedAppCode({
    entrySpecifier: "./entry",
    serverEntrySpecifier: hostSpecifier,
    scope,
    composeStyle: "hosted",
  });

  await Promise.all([
    writeIfChanged(manifestPath, manifestCode),
    writeIfChanged(entryPath, entryCode),
    writeIfChanged(appPath, appCode),
  ]);

  return {
    outDir,
    files: [manifestPath, entryPath, appPath],
  };
}
