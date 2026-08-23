import { ensureResponse, REPLY_DATA, REPLY_KIND } from "@taserjs/router-utils/reply";
import type { Context, MiddlewareHandler, Next } from "hono";
import { HTTPException } from "hono/http-exception";

import type { MiddlewareDefinition, PipelineContext, PipelineNext } from "../types.js";

/**
 * Lightweight Hono Context bridge for Taser middleware execution.
 */
export function createCompatHonoContext(ctx: PipelineContext): Context {
  const headers = new Headers();
  const res = {
    headers,
    status: 200,
  };
  const request = ctx.request as Request | undefined;
  const ctxHeaders = ctx.headers as import("../headers/taser-headers.js").TaserHeaders | undefined;
  const ctxParams = (ctx.params ?? {}) as Record<string, string>;
  const ctxQuery = (ctx.query ?? {}) as Record<string, string | string[]>;
  const varStore: Record<string, unknown> = (ctx.var as Record<string, unknown>) ?? {};

  return {
    req: {
      raw: request as never,
      method: ctx.method,
      url: request?.url ?? `http://localhost${ctx.path}`,
      path: ctx.path,
      header: (name?: string) =>
        name !== undefined ? ctxHeaders?.get(name) : ctxHeaders ? ctxHeaders.getAll() : {},
      param: (name?: string) => (name !== undefined ? ctxParams[name] : { ...ctxParams }),
      query: (name?: string) => (name !== undefined ? ctxQuery[name] : { ...ctxQuery }),
    },
    res,
    var: varStore,
    header(name: string, value: string, options?: { append?: boolean }) {
      if (options?.append) {
        headers.append(name, value);
      } else {
        headers.set(name, value);
      }
    },
    status(code: number) {
      res.status = code;
    },
    set(key: string, value: unknown) {
      varStore[key] = value;
    },
    get(key: string) {
      return varStore[key];
    },
    text(text: string, status?: number, headersInit?: HeadersInit) {
      return new Response(text, { status: status ?? res.status, headers: headersInit ?? headers });
    },
    json(object: unknown, status?: number, headersInit?: HeadersInit) {
      return new Response(JSON.stringify(object), {
        status: status ?? res.status,
        headers: { "content-type": "application/json", ...headersInit },
      });
    },
  } as unknown as Context;
}

/**
 * Resolves the Hono Context from Taser's pipeline context.
 * Returns existing Hono Context (if mounted in Hono) or creates a lightweight compat shim.
 */
function resolveHonoContext(ctx: PipelineContext): Context {
  const hono = ctx.hono as Context | undefined;
  if (hono) {
    return hono;
  }

  return createCompatHonoContext(ctx);
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

  const newHeaders = new Headers(response.headers);
  honoHeaders.forEach((value, key) => {
    newHeaders.set(key, value);
  });

  const newRes = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });

  const rawData = (response as unknown as Record<symbol, unknown>)[REPLY_DATA];
  const rawKind = (response as unknown as Record<symbol, unknown>)[REPLY_KIND];
  if (rawData !== undefined) {
    (newRes as unknown as Record<symbol, unknown>)[REPLY_DATA] = rawData;
  }
  if (rawKind !== undefined) {
    (newRes as unknown as Record<symbol, unknown>)[REPLY_KIND] = rawKind;
  }

  return newRes;
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

    let taserNextCalled = false;
    let taserNextResult: Response | undefined;

    const honoNext = async (): Promise<Response | void> => {
      taserNextCalled = true;
      syncHonoVarToCtx(c, pipelineCtx);
      taserNextResult = (await next()) as Response | undefined;
      return ensureResponse(taserNextResult);
    };

    try {
      const result = await middleware(c, honoNext as Next);

      if (result instanceof Response) {
        return syncHonoHeadersToResponse(c, result);
      }

      if (taserNextCalled && taserNextResult) {
        return syncHonoHeadersToResponse(c, taserNextResult);
      }

      syncHonoVarToCtx(c, pipelineCtx);
      const fallThroughResult = await next();
      const response = ensureResponse(fallThroughResult);
      return syncHonoHeadersToResponse(c, response);
    } catch (error) {
      if (error instanceof HTTPException) {
        return syncHonoHeadersToResponse(c, error.getResponse());
      }
      throw error;
    }
  };
}
