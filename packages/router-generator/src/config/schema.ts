import { z } from "zod";

import {
  DEFAULT_ENTRY,
  DEFAULT_IGNORE,
  DEFAULT_MANIFEST_HEADER,
  DEFAULT_ROUTES_DIR,
  DEFAULT_SERVER_DIR,
} from "../constants.js";

export const extensionSchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .default(true)
  .transform((value) => {
    if (typeof value === "string") {
      return value.startsWith(".") ? value : `.${value}`;
    }
    return value;
  });

export type ExtensionOption = z.infer<typeof extensionSchema>;

/** Taser-specific codegen, syntax, and route validation options */
export const taserOptionsSchema = z.object({
  rootDir: z.string().optional(),
  serverDir: z.string().default(DEFAULT_SERVER_DIR),
  entry: z.string().default(DEFAULT_ENTRY),
  serverEntry: z.string().optional(),
  routesDir: z.string().default(DEFAULT_ROUTES_DIR),
  basePath: z.string().optional(),
  extension: extensionSchema,
  quotes: z.enum(["single", "double"]).default("single"),
  semi: z.boolean().default(false),
  header: z.array(z.string()).default([...DEFAULT_MANIFEST_HEADER]),
  format: z.boolean().default(true),
  validate: z.boolean().default(true),
});

export type TaserOptions = z.infer<typeof taserOptionsSchema>;
export type TaserUserOptions = z.input<typeof taserOptionsSchema>;

/** Full combined config including routing and ignore patterns */
export const taserConfigSchema = taserOptionsSchema.extend({
  ignore: z.array(z.string()).default([...DEFAULT_IGNORE]),
  logLevel: z.number().default(3),
});

export type TaserConfig = z.infer<typeof taserConfigSchema>;
export type TaserUserConfig = z.input<typeof taserConfigSchema>;

export function resolveImportExtension(extension: ExtensionOption): string | null {
  if (extension === false) {
    return null;
  }
  if (extension === true) {
    return ".js";
  }
  return extension;
}
