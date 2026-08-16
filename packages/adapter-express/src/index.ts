import type { Express, RequestHandler } from "express";

import { getRequestListener } from "@hono/node-server";
import type { TaserApp, TaserHandler } from "@taserjs/router";
import { resolveMountBase } from "@taserjs/router-utils";

import { toUniversalMountPattern } from "./support/mount-pattern.js";

type ExpressNativeContext = { req: Express.Request; res: Express.Response };

export function createExpressHandler(taserApp: TaserApp): TaserHandler<Express> {
  return {
    mount(pattern: string, app: Express): void {
      const mountBase = resolveMountBase(toUniversalMountPattern(pattern));
      const mounted = taserApp.base(mountBase);
      const handler: RequestHandler = async (req, res) => {
        const fetcher = mounted.native({ req, res });
        await getRequestListener((request) => fetcher.fetch(request))(req, res);
      };

      app.all(pattern, handler);
    },
  };
}

declare module "@taserjs/router" {
  interface RouterRegister {
    NativeContext: ExpressNativeContext;
  }
}
