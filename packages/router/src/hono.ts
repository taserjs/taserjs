import { mergeResponseCookies } from "@taserjs/utils";
import type { Context, MiddlewareHandler as HonoMiddlewareHandler, Next as HonoNext } from "hono";

import { getOrCreateHonoContext } from "./context.js";
import type {
  DistributeServices,
  DistributeState,
  MiddlewareDefinition,
  NextFunction,
  ValidMiddlewareReturn,
} from "./types.js";

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

      let nextCalled = false;
      let downstreamResponse: Response | undefined;

      const honoNext: HonoNext = async () => {
        nextCalled = true;
        void c.res;
        downstreamResponse = (refine ? await refine(c, next) : await next()) as unknown as Response;
        mergeResponseCookies(c, downstreamResponse);
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

      if (result instanceof Response) {
        return result;
      }

      if (nextCalled) {
        return c.res ?? downstreamResponse!;
      }

      if (c.res instanceof Response) {
        return c.res;
      }

      throw new Error("Hono middleware did not call next() or return a Response");
    },
  };
}
