import { csrf as honoCsrf } from "hono/csrf";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const honoCsrfMiddleware = wrapHonoMiddleware(honoCsrf);

export function csrf(...args: Parameters<typeof honoCsrf>) {
  return honoCsrfMiddleware(...args);
}

export type CsrfOptions = NonNullable<Parameters<typeof honoCsrf>[0]>;
