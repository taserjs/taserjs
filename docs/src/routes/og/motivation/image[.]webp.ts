import { createFileRoute } from '@tanstack/react-router'

import { createOgImageResponse } from '@/lib/og-image.server'
import { sitePages } from '@/lib/og-meta'

export const Route = createFileRoute('/og/motivation/image.webp')({
  server: {
    handlers: {
      GET: async () => {
        const { title, description } = sitePages.motivation
        return await createOgImageResponse(title, description)
      },
    },
  },
})
