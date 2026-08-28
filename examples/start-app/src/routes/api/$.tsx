import { createFileRoute } from '@tanstack/react-router'
import { app } from '#taserjs/virtual/entry'

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: async ({request}) => app.fetch(request)
    }
  }
})
