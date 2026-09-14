import { csrf as honoCsrf } from "hono/csrf";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type CSRFOptions = Parameters<typeof honoCsrf>[0];

export function csrf(options?: CSRFOptions): MiddlewareDefinition {
  return hono(honoCsrf(options));
}
