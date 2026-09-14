import { etag as honoEtag, RETAINED_304_HEADERS } from "hono/etag";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type ETagOptions = Parameters<typeof honoEtag>[0];

export function etag(options?: ETagOptions): MiddlewareDefinition {
  return hono(honoEtag(options));
}

export { RETAINED_304_HEADERS };
