import { bodyLimit as honoBodyLimit } from "hono/body-limit";

import { defineMiddleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function bodyLimit(...args: Parameters<typeof honoBodyLimit>) {
  return defineMiddleware(honoMw(honoBodyLimit(...args)));
}

export type BodyLimitOptions = Parameters<typeof honoBodyLimit>[0];
