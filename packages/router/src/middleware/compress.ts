import { compress as honoCompress } from "hono/compress";

import { middleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function compress(...args: Parameters<typeof honoCompress>) {
  return middleware(honoMw(honoCompress(...args)));
}

export type CompressOptions = NonNullable<Parameters<typeof honoCompress>[0]>;
