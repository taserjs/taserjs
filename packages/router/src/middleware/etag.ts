import { etag as honoEtag } from "hono/etag";

import { wrapHonoMiddleware } from "./auth.js";

const honoEtagMiddleware = wrapHonoMiddleware(honoEtag);

export function etag(...args: Parameters<typeof honoEtag>) {
  return honoEtagMiddleware(...args);
}

export type EtagOptions = NonNullable<Parameters<typeof honoEtag>[0]>;
