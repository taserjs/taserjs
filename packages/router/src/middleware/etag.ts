import { etag as honoEtag } from "hono/etag";

import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type ETagOptions = Parameters<typeof honoEtag>[0];

export function etag(options?: ETagOptions): MiddlewareDefinition {
  return hono(honoEtag(options));
}
