import { etag as honoEtag } from "hono/etag";

import { defineMiddleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function etag(...args: Parameters<typeof honoEtag>) {
  return defineMiddleware(honoMw(honoEtag(...args)));
}

export type EtagOptions = NonNullable<Parameters<typeof honoEtag>[0]>;
