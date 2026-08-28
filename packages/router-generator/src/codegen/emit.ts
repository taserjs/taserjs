import { print } from "esrap";
import ts from "esrap/languages/ts";

import { DEFAULT_FORMATTING } from "../config.js";
import type { GeneratedModel } from "../types.js";
import {
  buildVirtualManifestProgram,
  joinManifestSections,
  type EmitManifestOptions,
} from "./manifest.js";
import { buildFullProgram } from "./types.js";

export type { EmitManifestOptions };

export type ManifestEmitKind = "virtual" | "ambient-types" | "standalone-manifest";

export type EmitManifestSourceOptions = EmitManifestOptions & {
  kind?: ManifestEmitKind | undefined;
};

function unwrapDefault<T>(mod: T): T {
  let curr: any = mod;
  while (
    curr &&
    typeof curr !== "function" &&
    typeof curr === "object" &&
    "default" in curr &&
    curr.default
  ) {
    curr = curr.default;
  }
  return curr;
}

/**
 * Emits route manifest source for a given program shape.
 *
 * - `virtual` — runtime manifest only (no `as const`, no type aliases)
 * - `ambient-types` — full program for `routes.d.ts`
 * - `standalone-manifest` — full program for standalone manifest files
 *
 * All kinds default to `DEFAULT_FORMATTING.quotes` when `quotes` is omitted.
 */
export function emitManifestSource(
  model: GeneratedModel,
  options: EmitManifestSourceOptions = {},
): string {
  const kind = options.kind ?? "virtual";
  const quotes = options.quotes ?? DEFAULT_FORMATTING.quotes;
  const program =
    kind === "virtual"
      ? buildVirtualManifestProgram(model, options.rewriteImportPath)
      : buildFullProgram(model, options.rewriteImportPath);

  const printFn = unwrapDefault(print);
  const tsLang = unwrapDefault(ts);
  const { code } = printFn(program, tsLang({ quotes }));
  const header = kind === "virtual" ? (options.header ?? []) : options.header;
  return joinManifestSections(header, code);
}

export function emitVirtualManifestSource(
  model: GeneratedModel,
  options: Partial<EmitManifestOptions> = {},
): string {
  return emitManifestSource(model, { ...options, kind: "virtual" });
}

export function emitTypeDeclarationsSource(
  model: GeneratedModel,
  options: Partial<EmitManifestOptions> = {},
): string {
  return emitManifestSource(model, { ...options, kind: "ambient-types" });
}

export function emitRouteManifestSource(
  model: GeneratedModel,
  options: EmitManifestOptions = {},
): string {
  return emitManifestSource(model, { ...options, kind: "standalone-manifest" });
}
