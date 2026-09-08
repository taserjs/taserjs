import type {
  MiddlewareHandler,
  NextFunction,
  RouteHandler,
  TaserRequest,
} from "./types.js";

export function createPipeline(
  middlewares: readonly MiddlewareHandler[],
  terminalHandler: RouteHandler,
) {
  return async function executePipeline(
    req: TaserRequest,
    ctx: Record<string, unknown>,
  ): Promise<Response> {
    let currentState: Record<string, unknown> = {};

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

      const res = await terminalHandler({ req, ctx, state: currentState });
      if (!(res instanceof Response)) {
        throw new TypeError(`Route handler must return a Response, received: ${typeof res}`);
      }
      return res;
    }

    return await dispatch(0, {});
  };
}
