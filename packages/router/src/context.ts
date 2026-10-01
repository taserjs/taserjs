import { Context } from "hono";

import type { ContextDefinition, ContextOptions } from "./types.js";

export function createContext<
  TBoot extends Record<string, unknown> = {},
  TRequest extends Record<string, unknown> = {},
>(options: ContextOptions<TBoot, TRequest>): ContextDefinition<TBoot, TRequest> {
  return {
    kind: "context",
    ...options,
  };
}

/**
 * Retrieves the ambient Hono Context attached to ctx, or initializes a fallback Context.
 */
export function getOrCreateHonoContext(
  req: { raw: Request },
  ctx: Record<string, unknown>,
): Context {
  let c = ctx.context as Context | undefined;
  if (!c) {
    c = new Context(req.raw);
    ctx.context = c;
  }
  return c;
}
