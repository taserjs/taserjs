import { compress as honoCompress } from "hono/compress";

import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type CompressionOptions = Parameters<typeof honoCompress>[0];

export function compress(options?: CompressionOptions): MiddlewareDefinition {
  return hono(honoCompress(options));
}
