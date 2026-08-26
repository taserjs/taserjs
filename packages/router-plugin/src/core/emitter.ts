import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "pathe";
import { emitVirtualEntrySource, emitVirtualManifestSource } from "@taserjs/router-generator";
import { getComposedAppCode } from "./compose.js";
import type { TaserVirtualContext } from "./types.js";

import {
  DISK_ARTIFACT_DIR,
  DISK_MANIFEST_PATH,
  DISK_ENTRY_PATH,
  DISK_APP_PATH,
} from "./constants.js";

export { DISK_ARTIFACT_DIR, DISK_MANIFEST_PATH, DISK_ENTRY_PATH, DISK_APP_PATH };

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

  const relToRoutes = relative(outDir, ctx.routesDir);
  const normalizedRel = relToRoutes.startsWith(".") ? relToRoutes : `./${relToRoutes}`;

  // 1. Manifest
  const manifestRaw = emitVirtualManifestSource(model, {
    header: ctx.formatting.header,
    quotes: ctx.formatting.quotes,
  });
  const manifestCode = manifestRaw
    .replaceAll("#taserjs/routes", normalizedRel)
    .replaceAll(/\.(js|mjs|cjs)(["'])/g, "$2");

  // 2. Entry
  const entryRaw = emitVirtualEntrySource({
    taserAppImportPath: ctx.entry,
    basePath: ctx.basePath,
  });
  const entryCode = entryRaw.replace("#taserjs/virtual/manifest", "./manifest");

  // 3. Composed app
  let hostSpecifier: string | undefined;
  if (ctx.serverEntryPath) {
    const relToHost = relative(outDir, ctx.serverEntryPath);
    const hostWithoutExt = relToHost.replace(/\.[cm]?[jt]sx?$/, "");
    hostSpecifier = hostWithoutExt.startsWith(".") ? hostWithoutExt : `./${hostWithoutExt}`;
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
