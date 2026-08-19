import { createTaserCompatHandler } from "@taserjs/router-core";
import { reply, validateSchema, ValidationError } from "@taserjs/router-utils";
import type { MiddlewareHandler } from "hono";

import { defineMiddleware } from "../define/middleware.js";
import type { InferOutput, Schema } from "../types/schema.js";
import type { MiddlewareReturnFromParts, MiddlewareUnit } from "../types/units.js";

export function wrapHonoMiddleware<F extends (...args: never[]) => MiddlewareHandler>(
  honoFactory: F,
): (
  ...args: Parameters<F>
) => MiddlewareUnit<MiddlewareReturnFromParts<unknown, unknown, unknown, {}>> {
  return (...args) => defineMiddleware(honoFactory(...args));
}

export type JwtPayloadState<TPayload> = {
  jwtPayload: TPayload;
};

export type AuthMiddlewareUnit<TPayload> = MiddlewareUnit<
  MiddlewareReturnFromParts<unknown, unknown, unknown, JwtPayloadState<TPayload>>
>;

export function createAuthMiddleware<TPayload>(
  payloadSchema: Schema<TPayload>,
  honoMw: MiddlewareHandler,
): AuthMiddlewareUnit<InferOutput<Schema<TPayload>>> {
  return defineMiddleware<JwtPayloadState<InferOutput<Schema<TPayload>>>>({
    handler: (ctx, next) => {
      return createTaserCompatHandler(honoMw)(ctx, async () => {
        const payload = (ctx as unknown as { var: { jwtPayload?: unknown } }).var.jwtPayload;
        try {
          const validated = (await validateSchema(payloadSchema, payload)) as InferOutput<
            Schema<TPayload>
          >;
          return next({ jwtPayload: validated });
        } catch (error) {
          if (error instanceof ValidationError) {
            return reply.forbidden({ error: "Forbidden", issues: error.issues });
          }
          throw error;
        }
      });
    },
  });
}
