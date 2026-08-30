import { cors as honoCors } from "hono/cors";

import { middleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function cors(...args: Parameters<typeof honoCors>) {
  return middleware(honoMw(honoCors(...args)));
}

export type CorsOptions = NonNullable<Parameters<typeof honoCors>[0]>;
