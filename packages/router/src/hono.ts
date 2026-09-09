import { Context } from "hono";
import type { MiddlewareHandler as HonoMiddlewareHandler, Next as HonoNext } from "hono";
import { mergeResponseCookies } from "@taserjs/utils";
import type { MiddlewareDefinition } from "./types.js";

export function hono(honoMw: HonoMiddlewareHandler): MiddlewareDefinition {
  return {
    kind: "middleware",
    handler: async (args, next) => {
      let c = args.ctx.context as Context | undefined;
      if (!c) {
        c = new Context(args.req.raw);
        (args.ctx as Record<string, unknown>).context = c;
      }

      let nextCalled = false;
      let downstreamResponse: Response | undefined;

      const honoNext: HonoNext = async () => {
        nextCalled = true;
        // Access c.res before next() to ensure #preparedHeaders are materialized into #res
        void c.res;
        downstreamResponse = await next();
        mergeResponseCookies(c, downstreamResponse);
      };

      const result = await honoMw(c, honoNext);

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
