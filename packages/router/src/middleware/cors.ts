import { cors as honoCors } from "hono/cors";

import { defineMiddleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function cors(...args: Parameters<typeof honoCors>) {
  return defineMiddleware(honoMw(honoCors(...args)));
}

export type CorsOptions = NonNullable<Parameters<typeof honoCors>[0]>;
