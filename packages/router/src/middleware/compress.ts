import { compress as honoCompress } from "hono/compress";

import { defineMiddleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function compress(...args: Parameters<typeof honoCompress>) {
  return defineMiddleware(honoMw(honoCompress(...args)));
}

export type CompressOptions = NonNullable<Parameters<typeof honoCompress>[0]>;
