import { createFileRoute } from '@tanstack/react-router'

import { createOgImageResponse } from '@/lib/og-image.server'
import { sitePages } from '@/lib/og-meta'

export const Route = createFileRoute('/og/home/image.webp')({
  server: {
    handlers: {
      GET: async () => {
        const { description } = sitePages.home
        return await createOgImageResponse('Next-gen API routing', description)
      },
    },
  },
})
