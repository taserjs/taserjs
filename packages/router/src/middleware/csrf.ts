import { csrf as honoCsrf } from "hono/csrf";

import { defineMiddleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function csrf(...args: Parameters<typeof honoCsrf>) {
  return defineMiddleware(honoMw(honoCsrf(...args)));
}

export type CsrfOptions = NonNullable<Parameters<typeof honoCsrf>[0]>;
