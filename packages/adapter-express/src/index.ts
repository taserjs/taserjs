import type { Express, RequestHandler } from "express";

import { getRequestListener } from "@hono/node-server";
import type { TaserApp, TaserHandler } from "@taserjs/router";
import { resolveMountBase } from "@taserjs/router-utils";

import { toUniversalMountPattern } from "./support/mount-pattern.js";

export function createExpressHandler(taserApp: TaserApp): TaserHandler<Express> {
  return {
    mount(pattern: string, app: Express): void {
      const mountBase = resolveMountBase(toUniversalMountPattern(pattern));

      const listener = getRequestListener((request) => taserApp.fetch(request));

      const handler: RequestHandler = async (req, res) => {
        await listener(req, res);
      };

      app.all(pattern, handler);
      if (mountBase !== pattern) {
        app.all(mountBase, handler);
      }
    },
  };
}
