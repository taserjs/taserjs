import { etag as honoEtag } from "hono/etag";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const wrapped = wrapHonoMiddleware(honoEtag);

export function etag(...args: Parameters<typeof honoEtag>) {
  return wrapped(...args);
}

export type EtagOptions = NonNullable<Parameters<typeof honoEtag>[0]>;
