import { z } from "zod";

import { DEFAULT_ENTRY, DEFAULT_IGNORE, DEFAULT_MANIFEST_HEADER } from "./constants.js";

export const extensionSchema = z
  .union([z.boolean(), z.string()])
  .default(true)
  .transform((value) => {
    if (typeof value === "string") {
      return value.startsWith(".") ? value : `.${value}`;
    }
    return value;
  });

export type ExtensionOption = z.infer<typeof extensionSchema>;

export const formattingSchema = z.object({
  quotes: z.enum(["single", "double"]).default("double"),
  semi: z.boolean().default(false),
  header: z.array(z.string()).default([...DEFAULT_MANIFEST_HEADER]),
  extension: extensionSchema,
});

export type FormattingOptions = z.input<typeof formattingSchema>;
export type ResolvedFormattingOptions = z.infer<typeof formattingSchema>;

export const DEFAULT_FORMATTING: ResolvedFormattingOptions = {
  quotes: "double",
  semi: false,
  header: [...DEFAULT_MANIFEST_HEADER],
  extension: true,
};

export const taserConfigSchema = z.object({
  routesDir: z.string().optional(),
  entry: z.string().default(DEFAULT_ENTRY),
  serverDir: z.string().optional(),
  serverEntry: z.string().optional(),
  basePath: z.string().optional(),
  ignore: z.array(z.string()).default([...DEFAULT_IGNORE]),
  formatting: formattingSchema.default(DEFAULT_FORMATTING),
});

export type TaserConfig = z.input<typeof taserConfigSchema>;
export type ResolvedTaserConfig = z.infer<typeof taserConfigSchema>;

export function resolveImportExtension(extension?: ExtensionOption): string | null {
  if (typeof extension === "string") {
    return extension.startsWith(".") ? extension : `.${extension}`;
  }
  return extension === false ? null : ".js";
}
