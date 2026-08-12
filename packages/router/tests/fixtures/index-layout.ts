import { z } from 'zod'

import { createTaserApp } from '../../src/index.js'

const t = createTaserApp().context({})

export const IndexLayout = t.middleware('index')
  .use({
    query: z.object({
      page: z.coerce.number().int().positive().default(1),
    }),
    state: z.object({
      user: z.string(),
    }),
    handler: (_ctx, next) => next({ state: { user: 'test' } }),
  })

export { t }
