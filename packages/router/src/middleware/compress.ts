import { compress as honoCompress } from "hono/compress";

import { wrapHonoMiddleware } from "./auth.js";

const honoCompressMiddleware = wrapHonoMiddleware(honoCompress);

export function compress(...args: Parameters<typeof honoCompress>) {
  return honoCompressMiddleware(...args);
}

export type CompressOptions = NonNullable<Parameters<typeof honoCompress>[0]>;
