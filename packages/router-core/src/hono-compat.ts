import { ensureReplyResult, type ReplyResult } from "@taserjs/router-utils";
import type { Context, MiddlewareHandler, Next } from "hono";
import { HTTPException } from "hono/http-exception";

import { toWireResponse } from "./error-handler.js";
import type { PipelineContext, PipelineNext } from "./run-middleware.js";
import type { MiddlewareDefinition } from "./types.js";

/**
 * Resolves the Hono Context from Taser's pipeline context.
 * Prefers `ctx.hono` (set by runtime) over `ctx.native` (set by adapters).
 */
function resolveHonoContext(ctx: PipelineContext): Context | undefined {
  const hono = ctx.hono as Context | undefined;
  if (hono) {
    return hono;
  }

  // Fallback to ctx.native if it's a Hono Context
  const native = ctx.native;
  if (native && typeof native === "object" && "req" in native && "var" in native) {
    return native as Context;
  }

  return undefined;
}

/**
 * Snapshots Hono context variables into the isolated Taser `ctx.var` bag.
 */
function syncHonoVarToCtx(c: Context, ctx: PipelineContext): void {
  ctx.var = { ...c.var };
}

/**
 * Syncs headers from Hono context to the response.
 * This ensures any headers set by Hono middleware are preserved.
 */
function syncHonoHeadersToResponse(c: Context, response: Response): Response {
  const honoHeaders = c.res.headers;
  let needsHeaderSync = false;

  honoHeaders.forEach((value, key) => {
    if (!response.headers.has(key) || response.headers.get(key) !== value) {
      needsHeaderSync = true;
    }
  });

  if (!needsHeaderSync) {
    return response;
  }

  honoHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Creates a Taser middleware handler that bridges a Hono middleware into the pipeline.
 * Used by `@taserjs/router`'s `defineMiddleware()` when passed a Hono middleware function.
 */
export function createTaserCompatHandler(
  middleware: MiddlewareHandler,
): MiddlewareDefinition["handler"] {
  return async (ctx: unknown, taserNext: unknown) => {
    const pipelineCtx = ctx as PipelineContext;
    const next = taserNext as PipelineNext;
    const c = resolveHonoContext(pipelineCtx);
    if (!c) {
      throw new Error(
        "defineMiddleware requires a Hono runtime context when wrapping Hono middleware. Use a Hono-based Taser app or pass native via app.native(c).fetch().",
      );
    }

    let taserNextCalled = false;
    let taserNextResult: ReplyResult | undefined;

    // Create Hono next function that bridges to Taser pipeline
    const honoNext = async (): Promise<Response | void> => {
      taserNextCalled = true;
      syncHonoVarToCtx(c, pipelineCtx);
      taserNextResult = await next();
      // Convert Taser result to Response for Hono
      return toWireResponse(ensureReplyResult(taserNextResult));
    };

    try {
      const result = await middleware(c, honoNext as Next);

      // If Hono middleware returned a Response, short-circuit
      if (result instanceof Response) {
        return syncHonoHeadersToResponse(c, result);
      }

      // If taserNext was called, return its result with synced headers
      if (taserNextCalled && taserNextResult) {
        const response = toWireResponse(taserNextResult);
        return syncHonoHeadersToResponse(c, response);
      }

      // Hono "fall through" (undefined + next not called) — continue Taser pipeline
      syncHonoVarToCtx(c, pipelineCtx);
      const fallThroughResult = await next();
      const response = toWireResponse(ensureReplyResult(fallThroughResult));
      return syncHonoHeadersToResponse(c, response);
    } catch (error) {
      if (error instanceof HTTPException) {
        return syncHonoHeadersToResponse(c, error.getResponse());
      }
      throw error;
    }
  };
}
