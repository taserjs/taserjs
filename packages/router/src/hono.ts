import { Context } from "hono";
import type { MiddlewareHandler as HonoMiddlewareHandler, Next as HonoNext } from "hono";
import { mergeResponseCookies } from "@taserjs/utils";
import type {
  DistributeServices,
  DistributeState,
  MiddlewareDefinition,
  MiddlewareResponse,
  NextFunction,
} from "./types.js";

export function hono<
  R extends
    | Response
    | Promise<Response>
    | MiddlewareResponse<any, any>
    | Promise<MiddlewareResponse<any, any>> = Promise<Response>,
>(
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
      let c = (args.ctx as Record<string, unknown>).context as Context | undefined;
      if (!c) {
        c = new Context(args.req.raw);
        (args.ctx as Record<string, unknown>).context = c;
      }

      let nextCalled = false;
      let downstreamResponse: Response | undefined;

      const honoNext: HonoNext = async () => {
        nextCalled = true;
        void c.res;
        downstreamResponse = refine ? await refine(c, next) : await next();
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
