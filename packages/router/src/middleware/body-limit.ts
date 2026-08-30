import { bodyLimit as honoBodyLimit } from "hono/body-limit";

import { middleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function bodyLimit(...args: Parameters<typeof honoBodyLimit>) {
  return middleware(honoMw(honoBodyLimit(...args)));
}

export type BodyLimitOptions = Parameters<typeof honoBodyLimit>[0];
