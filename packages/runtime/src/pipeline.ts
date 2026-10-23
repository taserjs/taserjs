import { isProduction, ValidationError, validateResponseSchema } from "@taserjs/utils";
import type { Context } from "hono";

import type {
  MiddlewareHandler,
  NextFunction,
  ResponseOptions,
  RouteHandler,
  RouteSchemas,
  TaserRequest,
} from "./types.js";
import {
  hasSchemas,
  validateSchemas,
  validateSchemasResult,
  validationErrorResponse,
  type ValidationFailure,
} from "./validation.js";

const EMPTY_STATE: Record<string, unknown> = Object.freeze({});

function syncCtxState(
  ctx: Record<string, unknown>,
  state: Record<string, unknown>,
  services?: Record<string, unknown> | undefined,
): void {
  (ctx as any).state = state;
  (ctx as any).services = services ?? {};
}

function shouldValidateResponse(
  options?: ResponseOptions | undefined,
  schemas?: RouteSchemas | undefined,
): boolean {
  if (!schemas?.returns) return false;
  // Hard gate: strictly disabled in production for zero overhead
  if (isProduction()) return false;
  // If explicitly disabled via response.validate: false
  if (options?.validate === false) return false;
  return true;
}

async function extractResponsePayload(res: Response): Promise<unknown> {
  if ("_data" in res && (res as { _data?: unknown })._data !== undefined) {
    return (res as { _data?: unknown })._data;
  }

  try {
    const cloned = res.clone();
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await cloned.json();
    }
    return await cloned.text();
  } catch {
    return undefined;
  }
}

async function validateResponseContract(
  res: Response,
  schemas: RouteSchemas | undefined,
): Promise<Response> {
  const returns = schemas?.returns;
  if (!returns) return res;

  const status = res.status;
  const statusSchema = returns[status as keyof typeof returns];
  if (!statusSchema) return res;

  const payload = await extractResponsePayload(res);
  await validateResponseSchema(statusSchema, payload, status);
  return res;
}

/**
 * Answers a rejected input with the 422 envelope directly. Only valid where no middleware sits
 * between validation and the app, because middleware is documented to catch `ValidationError`.
 * Without a Hono context there is nothing to build the response with, so it throws instead.
 */
function rejectValidation(failure: ValidationFailure, honoContext: Context | undefined): Response {
  if (!honoContext) throw new ValidationError(failure.issues, failure.facet);
  return validationErrorResponse(honoContext, failure.issues);
}

function toPromise(value: Response | Promise<Response>): Promise<Response> {
  return value instanceof Promise ? value : Promise.resolve(value);
}

function requireMiddlewareResponse(res: unknown, index: number): Response {
  if (!(res instanceof Response)) {
    throw new TypeError(
      `Middleware at index ${index} must return a Response, received: ${typeof res}`,
    );
  }
  return res;
}

function ensureResponse(res: unknown): Response {
  if (!(res instanceof Response)) {
    throw new TypeError(`Route handler must return a Response, received: ${typeof res}`);
  }
  return res;
}

/**
 * Compiles a lean terminal execution function tailored to whether
 * response contract validation is active or inactive.
 */
function compileTerminalExecutor(
  terminalHandler: RouteHandler,
  schemas: RouteSchemas | undefined,
  validateResponse: boolean,
): (args: unknown) => Response | Promise<Response> {
  if (!validateResponse || !schemas?.returns) {
    return (args: unknown) => {
      const res = terminalHandler(args as any);
      return res instanceof Promise ? res.then(ensureResponse) : ensureResponse(res);
    };
  }

  return (args: unknown) => {
    const res = terminalHandler(args as any);
    if (res instanceof Promise) {
      return res
        .then(ensureResponse)
        .then((finalRes) => validateResponseContract(finalRes, schemas));
    }
    return validateResponseContract(ensureResponse(res), schemas);
  };
}

export function createPipeline(
  middlewares: readonly MiddlewareHandler[],
  terminalHandler: RouteHandler,
  routeSchemas?: RouteSchemas | undefined,
  responseOptions?: ResponseOptions | undefined,
): (req: TaserRequest, ctx: Record<string, unknown>) => Response | Promise<Response> {
  const hasRouteSchemas = hasSchemas(routeSchemas);
  const responseValidationEnabled = shouldValidateResponse(responseOptions, routeSchemas);
  const executeTerminal = compileTerminalExecutor(
    terminalHandler,
    routeSchemas,
    responseValidationEnabled,
  );

  // Fast-path: routes with 0 middlewares bypass onion dispatch closure allocations completely
  if (middlewares.length === 0) {
    if (!hasRouteSchemas) {
      return function executeDirect(
        req: TaserRequest,
        ctx: Record<string, unknown>,
      ): Response | Promise<Response> {
        syncCtxState(ctx, EMPTY_STATE);
        return executeTerminal({
          req,
          ctx,
          state: EMPTY_STATE,
          params: req.params,
          query: req.query,
        });
      };
    }

    return function executeDirectWithSchemas(
      req: TaserRequest,
      ctx: Record<string, unknown>,
    ): Response | Promise<Response> {
      const honoContext = ctx.context as Context | undefined;
      syncCtxState(ctx, EMPTY_STATE);
      const outcome = validateSchemasResult(routeSchemas, req, honoContext);
      if (outcome instanceof Promise) {
        return outcome.then((failure) =>
          failure
            ? rejectValidation(failure, honoContext)
            : executeTerminal({
                req,
                ctx,
                state: EMPTY_STATE,
                params: req.params,
                query: req.query,
              }),
        );
      }
      if (outcome) return rejectValidation(outcome, honoContext);
      return executeTerminal({
        req,
        ctx,
        state: EMPTY_STATE,
        params: req.params,
        query: req.query,
      });
    };
  }

  // Middleware chains `next().catch(...)`, so `next` must hand back a real Promise and a
  // synchronous throw must surface as a rejection. This replaces `async` wrappers that added extra
  // promise hops on every layer.
  const runTerminal = (args: unknown): Promise<Response> => {
    try {
      return toPromise(executeTerminal(args));
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const checkMiddlewareResponses = middlewares.map(
    (_, index) => (res: unknown) => requireMiddlewareResponse(res, index),
  );

  // Fast-path: single middleware with no schemas bypasses recursive dispatch
  if (middlewares.length === 1 && !hasRouteSchemas && !responseValidationEnabled) {
    const middleware = middlewares[0]!;
    const checkResponse = checkMiddlewareResponses[0]!;
    return function executeSingleMiddleware(
      req: TaserRequest,
      ctx: Record<string, unknown>,
    ): Promise<Response> {
      let called = false;
      let currentState: Record<string, unknown> = EMPTY_STATE;
      let currentServices: Record<string, unknown> | undefined;

      const next = ((nextState?: Record<string, unknown>) => {
        if (called) {
          return Promise.reject(new Error("next() called multiple times"));
        }
        called = true;
        currentState = nextState ? { ...currentState, ...nextState } : currentState;
        syncCtxState(ctx, currentState);
        return runTerminal({
          req,
          ctx,
          state: currentState,
          params: req.params,
          query: req.query,
        });
      }) as unknown as NextFunction;

      next.provide = ((
        providedServices: Record<string, unknown>,
        nextState?: Record<string, unknown>,
      ) => {
        if (called) {
          return Promise.reject(new Error("next() called multiple times"));
        }
        called = true;
        currentServices = providedServices;
        currentState = nextState ? { ...currentState, ...nextState } : currentState;
        syncCtxState(ctx, currentState, currentServices);
        return runTerminal({
          req,
          ctx,
          state: currentState,
          params: req.params,
          query: req.query,
          ...providedServices,
        });
      }) as any;

      syncCtxState(ctx, EMPTY_STATE);
      try {
        const res = middleware(
          { req, ctx, state: EMPTY_STATE, params: req.params, query: req.query } as any,
          next,
        );
        return res instanceof Promise
          ? res.then(checkResponse)
          : Promise.resolve(checkResponse(res));
      } catch (error) {
        return Promise.reject(error);
      }
    };
  }

  // Composed Onion Pipeline for multi-middleware routes
  return function executePipeline(
    req: TaserRequest,
    ctx: Record<string, unknown>,
  ): Promise<Response> {
    let currentState: Record<string, unknown> = EMPTY_STATE;
    let currentServices: Record<string, unknown> = {};
    let hasServices = false;
    const honoContext = ctx.context as Context | undefined;

    function dispatch(
      index: number,
      state: Record<string, unknown>,
      services: Record<string, unknown>,
      servicesPresent: boolean,
    ): Promise<Response> {
      currentState = state;
      currentServices = services;
      hasServices = servicesPresent;
      syncCtxState(ctx, currentState, currentServices);

      try {
        if (index < middlewares.length) {
          return invokeMiddleware(index);
        }
        return dispatchTerminal();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    function invokeMiddleware(index: number): Promise<Response> {
      const middleware = middlewares[index]!;
      let called = false;

      const next = ((nextState?: Record<string, unknown> | undefined) => {
        if (called) {
          return Promise.reject(new Error("next() called multiple times"));
        }
        called = true;

        const mergedState = nextState ? { ...currentState, ...nextState } : currentState;
        return dispatch(index + 1, mergedState, currentServices, hasServices);
      }) as unknown as NextFunction;

      next.provide = ((
        providedServices: Record<string, unknown>,
        nextState?: Record<string, unknown> | undefined,
      ) => {
        if (called) {
          return Promise.reject(new Error("next() called multiple times"));
        }
        called = true;

        const mergedServices = hasServices
          ? { ...currentServices, ...providedServices }
          : providedServices;
        const mergedState = nextState ? { ...currentState, ...nextState } : currentState;
        return dispatch(index + 1, mergedState, mergedServices, true);
      }) as any;

      const middlewareArgs = hasServices
        ? {
            req,
            ctx,
            state: currentState,
            params: req.params,
            query: req.query,
            ...currentServices,
          }
        : { req, ctx, state: currentState, params: req.params, query: req.query };

      const res = middleware(middlewareArgs as any, next);
      const checkResponse = checkMiddlewareResponses[index]!;
      return res instanceof Promise ? res.then(checkResponse) : Promise.resolve(checkResponse(res));
    }

    function terminalArgs(): Record<string, unknown> {
      return hasServices
        ? {
            req,
            ctx,
            state: currentState,
            params: req.params,
            query: req.query,
            ...currentServices,
          }
        : { req, ctx, state: currentState, params: req.params, query: req.query };
    }

    function dispatchTerminal(): Promise<Response> {
      if (hasRouteSchemas) {
        const validation = validateSchemas(routeSchemas, req, honoContext);
        if (validation instanceof Promise) {
          return validation.then(() => runTerminal(terminalArgs()));
        }
      }
      // Built after validation so the handler sees the validated params and query.
      return runTerminal(terminalArgs());
    }

    return dispatch(0, EMPTY_STATE, {}, false);
  };
}
