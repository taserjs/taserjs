import { format } from 'oxfmt'

import type { ResolvedGeneratorConfig } from '../config/schema.js'
import { FormatCache } from './format-cache.js'

export type EmitManifestOptions = Pick<
  ResolvedGeneratorConfig,
  | 'extension'
  | 'quotes'
  | 'semi'
  | 'header'
  | 'footer'
  | 'format'
>

export async function formatManifestSource(
  source: string,
  config: Pick<ResolvedGeneratorConfig, 'quotes' | 'semi' | 'format'>,
  formatCache?: FormatCache,
): Promise<string> {
  if (!config.format) {
    return source
  }

  const cacheKey = FormatCache.createKey(source, config.quotes, config.semi)
  const cached = formatCache?.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  const { code } = await format('route-manifest.gen.ts', source, {
    singleQuote: config.quotes === 'single',
    semi: config.semi,
    useTabs: false,
    experimentalSortImports: false,
  })

  if (formatCache) {
    formatCache.set(cacheKey, code)
  }

  return code
}

export function joinManifestSections(
  header: string[],
  body: string,
  footer: string[],
): string {
  const sections = [...header, body, ...footer].filter(section => section.length > 0)
  return `${sections.join('\n')}\n`
}
