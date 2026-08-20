import { compress as honoCompress } from "hono/compress";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const wrapped = wrapHonoMiddleware(honoCompress);

export function compress(...args: Parameters<typeof honoCompress>) {
  return wrapped(...args);
}

export type CompressOptions = NonNullable<Parameters<typeof honoCompress>[0]>;
