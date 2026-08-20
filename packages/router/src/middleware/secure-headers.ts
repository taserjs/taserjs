import { secureHeaders as honoSecureHeaders } from "hono/secure-headers";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const wrapped = wrapHonoMiddleware(honoSecureHeaders);

export function secureHeaders(...args: Parameters<typeof honoSecureHeaders>) {
  return wrapped(...args);
}

export type SecureHeadersOptions = NonNullable<Parameters<typeof honoSecureHeaders>[0]>;
