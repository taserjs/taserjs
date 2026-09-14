export type HeroCodeTab = {
  id: string;
  label: string;
  filename: string;
};

export const heroCodeTabs: HeroCodeTab[] = [
  { id: "app", label: "App", filename: "taser.ts" },
  { id: "layout", label: "Layout", filename: "routes/$.ts" },
  { id: "auth", label: "Auth", filename: "routes/dashboard.ts" },
  { id: "route", label: "Route", filename: "routes/dashboard/users.get.ts" },
];

/** Human-readable per-tab sources for Shiki. */
export const heroTabSources: Record<string, string> = {
  app: `import { defineTaser, createContext } from '@taserjs/router'
import { notFound } from '@taserjs/router/reply'

export const context = createContext({
  boot: () => ({
    logger: console,
    db: createDb(),
  }),
  request: () => ({
    requestId: crypto.randomUUID(),
  }),
})

export default defineTaser({
  response: { validate: true },
})
  .context(context)
  .notFound(() => notFound({ message: 'Not Found' }))`,
  layout: `import { cors } from '@taserjs/router/middleware/cors'
import { t } from '@taserjs/router'

export default t.layout('/*')
  .use(cors({ origin: ['https://app.example.com'] }))`,
  auth: `import { jwt } from '@taserjs/router/middleware/jwt'
import { t } from '@taserjs/router'

type JwtClaims = {
  sub: string
  role: string
}

export default t.layout('/dashboard')
  .use(
    jwt<JwtClaims>({
      secret: process.env.JWT_SECRET!,
      alg: 'HS256',
    }),
  )`,
  route: `import { json } from '@taserjs/router/reply'
import { z } from 'zod'
import { t } from '@taserjs/router'

const GET = t.get('/dashboard/users')
  .query(z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
  }))

export default GET.handler(async ({ req, ctx, state }) => {
  const sub = state.jwtPayload.sub
  const { page, limit } = req.query
  const users = await ctx.db.getUsers(page, limit)
  return json({ sub, users })
})`,
};
