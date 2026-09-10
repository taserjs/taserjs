import type { Context } from "hono";
import { validateStandardSchema } from "@taserjs/utils";
import { extractBody } from "./body.js";
import type {
  MiddlewareHandler,
  NextFunction,
  RouteHandler,
  RouteSchemas,
  TaserRequest,
} from "./types.js";

export function hasSchemas(schemas?: RouteSchemas | undefined): boolean {
  return Boolean(schemas && (schemas.params || schemas.query || schemas.body));
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return (
    typeof val === "object" &&
    val !== null &&
    (val.constructor === Object || Object.getPrototypeOf(val) === null)
  );
}

function mergeValidated(original: unknown, validated: unknown): unknown {
  return isPlainObject(validated) && isPlainObject(original)
    ? { ...original, ...validated }
    : validated;
}

export async function validateSchemas(
  schemas: RouteSchemas | undefined,
  req: TaserRequest,
  c?: Context,
): Promise<void> {
  if (!schemas) return;

  // 1. params
  if (schemas.params) {
    const validated = await validateStandardSchema(schemas.params, req.params, "params");
    (req as { params: unknown }).params = mergeValidated(req.params, validated);
  }

  // 2. query
  if (schemas.query) {
    const validated = await validateStandardSchema(schemas.query, req.query, "query");
    (req as { query: unknown }).query = mergeValidated(req.query, validated);
  }

  // 3. body
  if (schemas.body) {
    if (req.body === undefined && c) {
      req.body = await extractBody(c, schemas.body.mode);
    }
    const validated = await validateStandardSchema(schemas.body.schema, req.body, "body");
    req.body = mergeValidated(req.body, validated);
  }
}

const EMPTY_STATE: Record<string, unknown> = Object.freeze({});

function ensureResponse(res: unknown): Response {
  if (!(res instanceof Response)) {
    throw new TypeError(`Route handler must return a Response, received: ${typeof res}`);
  }
  return res;
}

function invokeTerminalHandler(
  terminalHandler: RouteHandler,
  args: unknown,
): Response | Promise<Response> {
  const res = terminalHandler(args as any);
  if (res instanceof Promise) {
    return res.then(ensureResponse);
  }
  return ensureResponse(res);
}

export function createPipeline(
  middlewares: readonly MiddlewareHandler[],
  terminalHandler: RouteHandler,
  routeSchemas?: RouteSchemas | undefined,
): (req: TaserRequest, ctx: Record<string, unknown>) => Response | Promise<Response> {
  const hasRouteSchemas = hasSchemas(routeSchemas);

  // Fast-path: routes with 0 middlewares bypass onion dispatch closure allocations completely
  if (middlewares.length === 0) {
    if (!hasRouteSchemas) {
      return function executeDirect(
        req: TaserRequest,
        ctx: Record<string, unknown>,
      ): Response | Promise<Response> {
        return invokeTerminalHandler(terminalHandler, { req, ctx, state: EMPTY_STATE });
      };
    }

    return function executeDirectWithSchemas(
      req: TaserRequest,
      ctx: Record<string, unknown>,
    ): Promise<Response> {
      const honoContext = ctx.context as Context | undefined;
      const val = validateSchemas(routeSchemas, req, honoContext);
      if (val instanceof Promise) {
        return val.then(() =>
          invokeTerminalHandler(terminalHandler, { req, ctx, state: EMPTY_STATE }),
        );
      }
      return invokeTerminalHandler(terminalHandler, {
        req,
        ctx,
        state: EMPTY_STATE,
      }) as Promise<Response>;
    };
  }

  // Fast-path: single middleware with no schemas bypasses recursive dispatch
  if (middlewares.length === 1 && !hasRouteSchemas) {
    const middleware = middlewares[0]!;
    return async function executeSingleMiddleware(
      req: TaserRequest,
      ctx: Record<string, unknown>,
    ): Promise<Response> {
      let called = false;
      let currentState: Record<string, unknown> = EMPTY_STATE;
      let currentServices: Record<string, unknown> | undefined;

      const next = (async (nextState?: Record<string, unknown>) => {
        if (called) {
          throw new Error("next() called multiple times");
        }
        called = true;
        if (nextState) {
          currentState = nextState;
        }
        const handlerArgs = currentServices
          ? { req, ctx, state: currentState, ...currentServices }
          : { req, ctx, state: currentState };
        return await invokeTerminalHandler(terminalHandler, handlerArgs);
      }) as NextFunction;

      next.provide = async (
        providedServices: Record<string, unknown>,
        nextState?: Record<string, unknown>,
      ) => {
        if (called) {
          throw new Error("next() called multiple times");
        }
        called = true;
        currentServices = providedServices;
        if (nextState) {
          currentState = nextState;
        }
        return await invokeTerminalHandler(terminalHandler, {
          req,
          ctx,
          state: currentState,
          ...providedServices,
        });
      };

      const res = await middleware({ req, ctx, state: EMPTY_STATE } as any, next);
      if (!(res instanceof Response)) {
        throw new TypeError(
          `Middleware at index 0 must return a Response, received: ${typeof res}`,
        );
      }
      return res;
    };
  }

  return async function executePipeline(
    req: TaserRequest,
    ctx: Record<string, unknown>,
  ): Promise<Response> {
    let currentState: Record<string, unknown> = EMPTY_STATE;
    let currentServices: Record<string, unknown> = {};
    let hasServices = false;
    const honoContext = ctx.context as Context | undefined;

    async function dispatch(
      index: number,
      state: Record<string, unknown>,
      services: Record<string, unknown>,
      servicesPresent: boolean,
    ): Promise<Response> {
      currentState = state;
      currentServices = services;
      hasServices = servicesPresent;

      if (index < middlewares.length) {
        const middleware = middlewares[index]!;
        let called = false;

        const next = (async (nextState?: Record<string, unknown> | undefined) => {
          if (called) {
            throw new Error("next() called multiple times");
          }
          called = true;

          const mergedState = nextState ? { ...currentState, ...nextState } : currentState;
          return await dispatch(index + 1, mergedState, currentServices, hasServices);
        }) as NextFunction;

        next.provide = async (
          providedServices: Record<string, unknown>,
          nextState?: Record<string, unknown> | undefined,
        ) => {
          if (called) {
            throw new Error("next() called multiple times");
          }
          called = true;

          const mergedServices = hasServices
            ? { ...currentServices, ...providedServices }
            : providedServices;
          const mergedState = nextState ? { ...currentState, ...nextState } : currentState;
          return await dispatch(index + 1, mergedState, mergedServices, true);
        };

        const middlewareArgs = hasServices
          ? { req, ctx, state: currentState, ...currentServices }
          : { req, ctx, state: currentState };

        const res = await middleware(middlewareArgs as any, next);
        if (!(res instanceof Response)) {
          throw new TypeError(
            `Middleware at index ${index} must return a Response, received: ${typeof res}`,
          );
        }
        return res;
      }

      // Route middlewares finished: validate route schemas immediately before route handler
      if (routeSchemas) {
        await validateSchemas(routeSchemas, req, honoContext);
      }

      const handlerArgs = hasServices
        ? { req, ctx, state: currentState, ...currentServices }
        : { req, ctx, state: currentState };

      return await invokeTerminalHandler(terminalHandler, handlerArgs);
    }

    const finalRes = await dispatch(0, EMPTY_STATE, {}, false);
    return finalRes;
  };
}
