import { bodyLimit as honoBodyLimit } from "hono/body-limit";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const wrapped = wrapHonoMiddleware(honoBodyLimit);

export function bodyLimit(...args: Parameters<typeof honoBodyLimit>) {
  return wrapped(...args);
}

export type BodyLimitOptions = Parameters<typeof honoBodyLimit>[0];
