/**
 * Disk emission adapter: materializes the same sources the Vite plugin serves
 * as virtual modules into real files under `.taser/`.
 *
 * Used by hosts that cannot serve virtual modules (Next.js App Router). Files
 * are plain TypeScript with extensionless relative import specifiers so they
 * resolve under webpack, Turbopack, and `moduleResolution: "bundler"` without
 * any bundler-alias configuration.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "pathe";

import { ENTRY_ALIAS_ID, ROUTES_ALIAS_ID } from "../aliases.js";
import { getComposedAppCode } from "./compose.js";
import type { TaserVirtualContext } from "../types.js";

/** Default output directory for disk artifacts, relative to the project root. */
export const DISK_ARTIFACT_DIR = ".taser";
export const DISK_APP_PATH = `${DISK_ARTIFACT_DIR}/app.ts`;
export const DISK_ENTRY_PATH = `${DISK_ARTIFACT_DIR}/entry.ts`;
export const DISK_MANIFEST_PATH = `${DISK_ARTIFACT_DIR}/manifest.ts`;

const VIRTUAL_MANIFEST_SPEC = "#taserjs/virtual/manifest";
const VIRTUAL_ENTRY_SPEC = "#taserjs/virtual/entry";

export type DiskArtifacts = {
  outDir: string;
  /** Absolute paths of written files. */
  files: string[];
};

export type WriteDiskArtifactsOptions = {
  /** Output directory; defaults to `<rootDir>/.taser`. */
  outDir?: string | undefined;
  /**
   * URL scope the host mounts Taser under (e.g. Next `basePath`). Overrides
   * the context basePath when provided.
   */
  scope?: string | undefined;
};

/**
 * Maps a framework-virtual specifier to its on-disk target (absolute path
 * without extension), or undefined when the specifier should be left alone.
 */
function resolveSpecifierTarget(
  spec: string,
  fromDir: string,
  ctx: TaserVirtualContext,
): string | undefined {
  if (spec === VIRTUAL_MANIFEST_SPEC) {
    return join(fromDir, "manifest");
  }
  if (spec === VIRTUAL_ENTRY_SPEC) {
    return join(fromDir, "entry");
  }
  if (spec.startsWith(`${ROUTES_ALIAS_ID}/`)) {
    return join(ctx.routesDir, spec.slice(ROUTES_ALIAS_ID.length + 1));
  }
  if (spec === ENTRY_ALIAS_ID || spec.startsWith(`${ENTRY_ALIAS_ID}/`)) {
    return ctx.entryPath;
  }
  return undefined;
}

/** Extensionless relative specifier from `fromDir` to an absolute no-ext path. */
function toRelativeSpecifier(targetNoExt: string, fromDir: string): string {
  const rel = relative(fromDir, targetNoExt)
    .replace(/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/, "")
    .replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * Rewrites all framework-virtual specifiers in emitted source into
 * extensionless relative specifiers rooted at `fromDir`. Non-virtual
 * specifiers (bare packages, other relatives) pass through untouched.
 */
function relativizeSpecifiers(code: string, fromDir: string, ctx: TaserVirtualContext): string {
  return code.replace(/(["'])((?:#taserjs)\/[^"']*)\1/g, (full, quote: string, spec: string) => {
    const target = resolveSpecifierTarget(spec, fromDir, ctx);
    if (!target) {
      return full;
    }
    // Drop a trailing compiled `.js` from route/layout specifiers; targets are
    // already extension-stripped.
    const normalized = target.replace(/\.js$/, "");
    return `${quote}${toRelativeSpecifier(normalized, fromDir)}${quote}`;
  });
}

/**
 * Writes the disk artifact set for hosts that consume real files:
 *
 * - `<outDir>/manifest.ts` — route manifest with relative imports
 * - `<outDir>/entry.ts`    — eager Taser app construction + request handler
 * - `<outDir>/app.ts`      — hosted-style composed fetch handler (no global
 *   Response override, no Nitro interop)
 */
export async function writeDiskArtifacts(
  ctx: TaserVirtualContext,
  options: WriteDiskArtifactsOptions = {},
): Promise<DiskArtifacts> {
  const outDir = resolve(ctx.rootDir, options.outDir ?? DISK_ARTIFACT_DIR);

  const manifestSource = relativizeSpecifiers(await ctx.getManifestCode(), outDir, ctx);
  const entrySource = relativizeSpecifiers(await ctx.getEntryCode(), outDir, ctx);
  const appSource = relativizeSpecifiers(
    getComposedAppCode({
      composeStyle: "hosted",
      scope: options.scope ?? ctx.basePath,
    }),
    outDir,
    ctx,
  );

  const writes: Array<[string, string]> = [
    [join(outDir, "manifest.ts"), manifestSource],
    [join(outDir, "entry.ts"), entrySource],
    [join(outDir, "app.ts"), appSource],
  ];

  await mkdir(outDir, { recursive: true });
  await Promise.all(writes.map(([filePath, contents]) => writeFile(filePath, contents, "utf8")));

  return { outDir, files: writes.map(([filePath]) => filePath) };
}
