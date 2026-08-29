import { secureHeaders as honoSecureHeaders } from "hono/secure-headers";

import { defineMiddleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function secureHeaders(...args: Parameters<typeof honoSecureHeaders>) {
  return defineMiddleware(honoMw(honoSecureHeaders(...args)));
}

export type SecureHeadersOptions = NonNullable<Parameters<typeof honoSecureHeaders>[0]>;
