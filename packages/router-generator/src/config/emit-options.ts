import type { ResolvedGeneratorConfig } from "../config/schema.js";
import type { ScanOptions } from "../scan/scan-routes.js";

export function toScanOptions(
  config: Pick<ResolvedGeneratorConfig, "extension" | "validate">,
): ScanOptions {
  return {
    extension: config.extension,
    validate: config.validate,
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
