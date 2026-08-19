import type { FastifyInstance, FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";

import { getRequestListener } from "@hono/node-server";
import type { TaserApp, TaserHandler } from "@taserjs/router";
import { resolveMountBase } from "@taserjs/router-utils";

type FastifyNativeContext = { req: FastifyRequest; reply: FastifyReply };

export function createFastifyHandler(taserApp: TaserApp): TaserHandler<FastifyInstance> {
  return {
    mount(pattern: string, app: FastifyInstance): void {
      const mountBase = resolveMountBase(pattern);
      const handler: RouteHandlerMethod = async (req, reply) => {
        const fetcher = taserApp.native({ req, reply });
        await getRequestListener((request) => fetcher.fetch(request))(req.raw, reply.raw);
      };

      app.all(pattern, handler);
      if (mountBase !== "/" && mountBase !== pattern) {
        app.all(mountBase, handler);
      }
    },
  };
}

declare module "@taserjs/router" {
  interface RouterRegister {
    NativeContext: FastifyNativeContext;
  }
}
