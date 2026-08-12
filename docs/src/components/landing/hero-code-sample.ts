export type HeroCodeTab = {
  id: string
  label: string
  filename: string
}

export const heroCodeTabs: HeroCodeTab[] = [
  { id: 'context', label: 'Context', filename: 'context.ts' },
  { id: 'layout', label: 'Layout', filename: 'routes/$.ts' },
  { id: 'auth', label: 'Auth', filename: 'routes/dashboard.ts' },
  { id: 'route', label: 'Route', filename: 'routes/dashboard/users.get.ts' },
]

/** Human-readable per-tab sources for Shiki. */
export const heroTabSources: Record<string, string> = {
  context: `import { createContext } from '@taserjs/router'

export const context = createContext({
  boot: () => ({
    logger: console,
    db: createDb(),
  }),
  request: () => ({
    requestId: crypto.randomUUID(),
  }),
})`,
  layout: `import { t } from '../taser'
import { cors } from '@taserjs/router/cors'
import { secureHeaders } from '@taserjs/router/secure-headers'

export const Middleware = t.middleware('/$')
  .use(secureHeaders())
  .use(cors({ origin: ['https://app.example.com'] }))`,
  auth: `import { jwt } from '@taserjs/router/jwt'
import { z } from 'zod'

const payloadSchema = z.object({ sub: z.string(), role: z.string() })
export const Middleware = t.middleware('dashboard')
  .use(
    jwt(payloadSchema, {
      secret: process.env.JWT_SECRET!,
      alg: 'HS256',
    }),
  )`,
  route: `const GET = t.get('/dashboard/users', {
  query: z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
  }),
})

export const Route = GET.handler(async (ctx) => {
  const sub = ctx.state.jwtPayload.sub
  // sub: string
  const page = ctx.query.page
  // page: number
  const limit = ctx.query.limit
  const users = await ctx.db.getUsers(page, limit)
  return ctx.reply.json({ sub, users })
})`,
}
