import type { ResolvedGeneratorConfig } from "../config/schema.js";
import type { ScanOptions } from "../scan/scan-routes.js";

export function toScanOptions(
  config: Pick<
    ResolvedGeneratorConfig,
    "extension" | "validate" | "ignorePrefix" | "ignorePattern"
  >,
): ScanOptions {
  return {
    extension: config.extension,
    validate: config.validate,
    ignorePrefix: config.ignorePrefix,
    ignorePattern: config.ignorePattern,
  };
}

export function toEmitManifestOptions(
  config: ResolvedGeneratorConfig,
): Pick<ResolvedGeneratorConfig, "extension" | "quotes" | "semi" | "header" | "footer" | "format"> {
  return {
    extension: config.extension,
    quotes: config.quotes,
    semi: config.semi,
    header: config.header,
    footer: config.footer,
    format: config.format,
  };
}
