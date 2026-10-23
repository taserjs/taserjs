import type { Context, MiddlewareHandler as HonoMiddlewareHandler, Next as HonoNext } from "hono";

import { getOrCreateHonoContext } from "./context.js";
import type {
  DistributeServices,
  DistributeState,
  MiddlewareDefinition,
  NextFunction,
  ValidMiddlewareReturn,
} from "./types.js";

/**
 * Makes the Hono context carry the downstream response. Hono's `c.res` setter clones the response
 * and copies the context's prepared headers over it, replacing `Set-Cookie` with the context's own
 * values, so downstream cookies only need re-adding when both sides have some.
 */
function adoptDownstreamResponse(c: Context, downstream: Response): void {
  const prepared = c.res;
  if (prepared === downstream) {
    c.finalized = true;
    return;
  }

  const preparedCookies = prepared.headers.getSetCookie();
  const downstreamCookies = downstream.headers.getSetCookie();
  c.res = downstream;

  if (preparedCookies.length === 0 || downstreamCookies.length === 0) return;
  for (const cookie of downstreamCookies) {
    c.res.headers.append("set-cookie", cookie);
  }
}

export function hono<R extends ValidMiddlewareReturn = Promise<Response>>(
  honoMw: HonoMiddlewareHandler,
  refine?: (c: Context, next: NextFunction) => R,
): MiddlewareDefinition<
  DistributeServices<Awaited<R>>,
  DistributeState<Awaited<R>>,
  unknown,
  unknown,
  unknown
> {
  return {
    kind: "middleware",
    handler: async (args, next) => {
      const c = getOrCreateHonoContext(args.req, args.ctx as Record<string, unknown>);

      const honoNext: HonoNext = async () => {
        const downstream = (refine ? await refine(c, next) : await next()) as unknown as Response;
        adoptDownstreamResponse(c, downstream);
      };

      let result: Response | void;
      try {
        result = await honoMw(c, honoNext);
      } catch (err: any) {
        if (typeof err?.getResponse === "function") {
          return err.getResponse();
        }
        if (err?.res instanceof Response) {
          return err.res;
        }
        throw err;
      }

      if (result instanceof Response) return result;

      if (!c.finalized) {
        throw new Error(
          "Hono middleware must call next() or return a Response (context was not finalized)",
        );
      }
      return c.res;
    },
  };
}
