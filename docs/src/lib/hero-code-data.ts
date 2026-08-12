import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'

import { heroCodeTabs, heroTabSources } from '@/components/landing/hero-code-sample'
import { highlightCode } from '@/lib/highlight-code'

export type HeroHighlightedTabs = Record<string, string>

export const loadHeroHighlightedTabs = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async (): Promise<HeroHighlightedTabs> => {
    const entries: HeroHighlightedTabs = {}

    for (const tab of heroCodeTabs) {
      entries[tab.id] = await highlightCode(heroTabSources[tab.id])
    }

    return entries
  })
