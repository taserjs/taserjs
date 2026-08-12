import { cors as honoCors } from 'hono/cors'

import { wrapHonoMiddleware } from './auth.js'

const honoCorsMiddleware = wrapHonoMiddleware(honoCors)

export function cors(...args: Parameters<typeof honoCors>) {
  return honoCorsMiddleware(...args)
}

export type CorsOptions = NonNullable<Parameters<typeof honoCors>[0]>
