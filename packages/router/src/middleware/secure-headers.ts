import { secureHeaders as honoSecureHeaders } from "hono/secure-headers";

import { middleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function secureHeaders(...args: Parameters<typeof honoSecureHeaders>) {
  return middleware(honoMw(honoSecureHeaders(...args)));
}

export type SecureHeadersOptions = NonNullable<Parameters<typeof honoSecureHeaders>[0]>;
