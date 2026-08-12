import { createFileRoute, notFound } from '@tanstack/react-router'

import { createOgImageResponse } from '@/lib/og-image.server'
import { source } from '@/lib/source'

export const Route = createFileRoute('/og/docs/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const segments = params._splat?.split('/').filter(Boolean) ?? []
        if (segments.at(-1) !== 'image.webp') {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw notFound()
        }

        const slugs = segments.slice(0, -1)
        const page = source.getPage(slugs)
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        if (!page) throw notFound()

        return await createOgImageResponse(page.data.title, page.data.description ?? '')
      },
    },
  },
})
