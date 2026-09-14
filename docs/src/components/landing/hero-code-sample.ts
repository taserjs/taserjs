export type HeroCodeTab = {
  id: string;
  label: string;
  filename: string;
};

export const heroCodeTabs: HeroCodeTab[] = [
  { id: "app", label: "App", filename: "taser.ts" },
  { id: "auth", label: "Auth", filename: "routes/dashboard.ts" },
  { id: "route", label: "Route", filename: "routes/dashboard/index.get.ts" },
];

/** Human-readable per-tab sources for Shiki. */
export const heroTabSources: Record<string, string> = {
  app: `import { defineTaser, createContext } from '@taserjs/router'
import { notFound } from '@taserjs/router/reply'

export const context = createContext({
  boot: () => ({ logger: pino, db: ... }),
  request: (req) => ({ 
    requestId: req.headers.get('x-request-id') || crypto.randomUUID() 
  }),
})

export default defineTaser({ response: { validate: true }})
  .context(context)
  .notFound(() => notFound({ message: 'Not Found' }))`,
  auth: `import { unauthorized } from '@taserjs/router/reply'
import { t } from '@taserjs/router'

export default t.layout('/dashboard/*').use(async (ctx, next) => {
  const user = await getUserSession(ctx.headers.get('Authorization'))
  if (!user) {
    return unauthorized({ message: 'Sign in required' })
  }

  return next({ user })
})`,
  route: `import { json } from '@taserjs/router/reply'
import { t } from '@taserjs/router'

export default t.get('/dashboard').handler(async ({ ctx, state }) => {
  const { user } = state // state -> { user: User }
  const stats = await ctx.db.getDashboardStats(user.id)

  return json({
    greeting: \`Welcome back, \${user.name}\`,
    user,
    stats,
  })
})`,
};
