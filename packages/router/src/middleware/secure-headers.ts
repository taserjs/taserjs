import { secureHeaders as honoSecureHeaders } from 'hono/secure-headers'

import { wrapHonoMiddleware } from './auth.js'

const honoSecureHeadersMiddleware = wrapHonoMiddleware(honoSecureHeaders)

export function secureHeaders(...args: Parameters<typeof honoSecureHeaders>) {
  return honoSecureHeadersMiddleware(...args)
}

export type SecureHeadersOptions = NonNullable<Parameters<typeof honoSecureHeaders>[0]>
