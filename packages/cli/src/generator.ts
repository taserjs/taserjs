import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { dirname } from "pathe";

import type { ResolvedTaserConfig } from "./config-shared.js";
import { resolvePaths } from "./config-shared.js";
import { renderManifest } from "./render.js";
import { APP_STUB } from "./scaffold.js";
import type { ScanResult } from "./scan-types.js";
import { scanRoutes } from "./scanner.js";

function writeIfChanged(filePath: string, content: string): boolean {
  if (existsSync(filePath) && readFileSync(filePath, "utf-8") === content) return false;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
  return true;
}

export interface GenerateResult {
  manifestPath: string;
  manifestWritten: boolean;
  content: string;
}

export function generateManifest(
  scanResult: ScanResult,
  config: ResolvedTaserConfig,
  cwd: string = process.cwd(),
): GenerateResult {
  const { diagnostics } = scanResult;
  if (diagnostics.length > 0) {
    const errors = diagnostics.map((d) => `  - ${d.filePath}: ${d.message}`).join("\n");
    throw new Error(`Build failed with ${diagnostics.length} diagnostic error(s):\n${errors}`);
  }

  const content = renderManifest(scanResult, config, cwd);
  const { manifestFile } = resolvePaths(config, cwd);
  return {
    manifestPath: manifestFile,
    manifestWritten: writeIfChanged(manifestFile, content),
    content,
  };
}

export interface ExecuteGenerateOptions {
  cwd?: string | undefined;
  config: ResolvedTaserConfig;
  /** Fill empty route and layout files with starter stubs (dev and watch mode). */
  scaffold?: boolean | undefined;
}

export interface ExecuteGenerateResult {
  scanResult: ScanResult;
  generateResult: GenerateResult;
}

/**
 * Scans routes and writes the manifest. Returns null (after warning) when the routes directory
 * is missing so callers never overwrite an existing manifest with an empty one.
 */
export function executeGenerate(options: ExecuteGenerateOptions): ExecuteGenerateResult | null {
  const { config, scaffold } = options;
  const cwd = options.cwd ?? process.cwd();
  const { routesDir, appFile } = resolvePaths(config, cwd);

  if (!existsSync(routesDir)) {
    console.warn(
      `[taserjs] Routes directory not found: ${routesDir}. Skipping manifest generation.`,
    );
    return null;
  }

  if (!existsSync(appFile)) {
    mkdirSync(dirname(appFile), { recursive: true });
    writeFileSync(appFile, APP_STUB, "utf-8");
  }

  const scanResult = scanRoutes({ routesDir, cwd, scaffold });
  return { scanResult, generateResult: generateManifest(scanResult, config, cwd) };
}

export type { ScanDiagnostic } from "./scan-types.js";
