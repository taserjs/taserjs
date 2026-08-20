import type { FastifyInstance, RouteHandlerMethod } from "fastify";

import { getRequestListener } from "@hono/node-server";
import type { TaserApp, TaserHandler } from "@taserjs/router";
import { resolveMountBase } from "@taserjs/router-utils";

export function createFastifyHandler(taserApp: TaserApp): TaserHandler<FastifyInstance> {
  return {
    mount(pattern: string, app: FastifyInstance): void {
      const mountBase = resolveMountBase(pattern);

      const listener = getRequestListener((request) => taserApp.fetch(request));

      const handler: RouteHandlerMethod = async (req, reply) => {
        await listener(req.raw, reply.raw);
      };

      app.all(pattern, handler);
      if (mountBase !== "/" && mountBase !== pattern) {
        app.all(mountBase, handler);
      }
    },
  };
}
