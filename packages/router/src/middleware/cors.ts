import { cors as honoCors } from "hono/cors";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const wrapped = wrapHonoMiddleware(honoCors);

export function cors(...args: Parameters<typeof honoCors>) {
  return wrapped(...args);
}

export type CorsOptions = NonNullable<Parameters<typeof honoCors>[0]>;
