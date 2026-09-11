import { cors as honoCors } from "hono/cors";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type CORSOptions = Parameters<typeof honoCors>[0];

export function cors(options?: CORSOptions): MiddlewareDefinition {
  return hono(honoCors(options));
}
