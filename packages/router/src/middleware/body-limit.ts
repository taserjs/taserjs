import { bodyLimit as honoBodyLimit } from "hono/body-limit";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const honoBodyLimitMiddleware = wrapHonoMiddleware(honoBodyLimit);

export function bodyLimit(...args: Parameters<typeof honoBodyLimit>) {
  return honoBodyLimitMiddleware(...args);
}

export type BodyLimitOptions = Parameters<typeof honoBodyLimit>[0];
