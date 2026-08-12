import { z } from 'zod'

import {
  DEFAULT_ENTRY,
  DEFAULT_MANIFEST_HEADER,
  DEFAULT_OUTPUT,
  DEFAULT_ROUTE_FILE_IGNORE_PREFIX,
  DEFAULT_ROUTES,
} from '../constants.js'

export { CONFIG_FILE_NAME } from '../constants.js'

export const extensionSchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .default(true)
  .transform((value) => {
    if (typeof value === 'string') {
      return value.startsWith('.') ? value : `.${value}`
    }
    return value
  })

export type ExtensionOption = z.infer<typeof extensionSchema>

export const generatorConfigSchema = z.object({
  routes: z.string().default(DEFAULT_ROUTES),
  output: z.string().default(DEFAULT_OUTPUT),
  entry: z.string().default(DEFAULT_ENTRY),
  extension: extensionSchema,
  ignorePrefix: z.string().default(DEFAULT_ROUTE_FILE_IGNORE_PREFIX),
  ignorePattern: z.string().optional(),
  quiet: z.boolean().default(false),
  quotes: z.enum(['single', 'double']).default('single'),
  semi: z.boolean().default(false),
  header: z.array(z.string()).default([...DEFAULT_MANIFEST_HEADER]),
  footer: z.array(z.string()).default([]),
  format: z.boolean().default(true),
  validate: z.boolean().default(true),
})

export type GeneratorConfigFile = z.infer<typeof generatorConfigSchema>

export type ResolvedGeneratorConfig = GeneratorConfigFile & {
  configFile: string
  configDir: string
  routesDir: string
  outputFile: string
}

export type GeneratorRunOptions = Partial<GeneratorConfigFile> & {
  configFile?: string
  force?: boolean
}

export function resolveImportExtension(extension: ExtensionOption): string | null {
  if (extension === false) {
    return null
  }
  if (extension === true) {
    return '.js'
  }
  return extension
}
