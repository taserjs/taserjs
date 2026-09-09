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

export async function validateSchemas(
  schemas: RouteSchemas | undefined,
  req: TaserRequest,
  c?: Context,
): Promise<void> {
  if (!schemas) return;

  // 1. params
  if (schemas.params) {
    const validated = await validateStandardSchema(schemas.params, req.params, "params");
    (req as { params: unknown }).params = validated;
  }

  // 2. query
  if (schemas.query) {
    const validated = await validateStandardSchema(schemas.query, req.query, "query");
    (req as { query: unknown }).query = validated;
  }

  // 3. body
  if (schemas.body) {
    if (req.body === undefined && c) {
      req.body = await extractBody(c, schemas.body.mode);
    }
    const validated = await validateStandardSchema(schemas.body.schema, req.body, "body");
    req.body = validated;
  }
}

export function createPipeline(
  middlewares: readonly MiddlewareHandler[],
  terminalHandler: RouteHandler,
  routeSchemas?: RouteSchemas | undefined,
) {
  return async function executePipeline(
    req: TaserRequest,
    ctx: Record<string, unknown>,
  ): Promise<Response> {
    let currentState: Record<string, unknown> = {};
    const honoContext = ctx.context as Context | undefined;

    async function dispatch(index: number, state: Record<string, unknown>): Promise<Response> {
      currentState = state;

      if (index < middlewares.length) {
        const middleware = middlewares[index]!;
        let called = false;

        const next: NextFunction = async (nextState?: Record<string, unknown> | undefined) => {
          if (called) {
            throw new Error("next() called multiple times");
          }
          called = true;

          const mergedState = nextState ? { ...currentState, ...nextState } : currentState;
          return await dispatch(index + 1, mergedState);
        };

        const res = await middleware({ req, ctx, state: currentState }, next);
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

      const res = await terminalHandler({ req, ctx, state: currentState });
      if (!(res instanceof Response)) {
        throw new TypeError(`Route handler must return a Response, received: ${typeof res}`);
      }
      return res;
    }

    return await dispatch(0, {});
  };
}
