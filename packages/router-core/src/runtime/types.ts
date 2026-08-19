import type { ResponseValidationFailureHandler } from "@taserjs/router-utils";

import type { Awaitable, OnErrorHandler } from "../types.js";
import type { PipelineContext } from "../run-middleware.js";

export type TaserNativeBoundRuntime = {
  fetch(
    request: Request,
    env?: unknown,
    executionCtx?: import("hono").ExecutionContext,
  ): Promise<Response>;
};

export type CreateTaserRuntimeOptions = {
  basePath?: string;
  onError?: OnErrorHandler;
  notFound?: NotFoundHandler;
  response?: {
    /** Validate handler replies against returns maps. Default true. */
    validate?: boolean;
    onValidationFailure?: ResponseValidationFailureHandler;
  };
  cookies?: {
    secret?: string | BufferSource;
    /** Default serialize options for all set/setSigned/delete calls. Per-call options override. */
    path?: string;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
    secure?: boolean;
    domain?: string;
    maxAge?: number;
    expires?: Date;
  };
};

export type NotFoundHandler = (ctx: PipelineContext) => Awaitable<unknown>;

export type TaserRuntime = {
  fetch(
    request: Request,
    env?: unknown,
    executionCtx?: import("hono").ExecutionContext,
  ): Promise<Response>;
  native(boundNative: unknown): TaserNativeBoundRuntime;
  onError(handler: OnErrorHandler | OnErrorHandler["handle"]): TaserRuntime;
  notFound(handler: NotFoundHandler): TaserRuntime;
};
