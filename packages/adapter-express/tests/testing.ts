import { createTaserApp, type RouteManifestShape, type TaserApp } from "@taserjs/router";
import { reply } from "@taserjs/router-utils";

export function createTestLayout(layout = "root") {
  return { layout, middlewares: [] as const };
}

export function createTestRoute(
  path: string,
  handler: () => Promise<Response> | Response,
  method: "GET" = "GET",
) {
  return {
    path,
    method,
    middlewares: [] as const,
    handlerMiddlewares: [] as const,
    handler,
  };
}

export function createHelloApp(
  options?: import("@taserjs/router").CreateTaserAppOptions,
): TaserApp {
  const layout = createTestLayout("root");
  const route = createTestRoute("/hello", () => Promise.resolve(reply.json({ ok: true })));

  const manifest = {
    layouts: {
      root: { middlewares: layout },
    },
    routes: {
      "/hello": {
        GET: { layoutChain: ["root"], route },
      },
    },
  } satisfies RouteManifestShape;

  return createTaserApp(options).context({}).create(manifest);
}

export function createAfterHookApp(): TaserApp {
  const layout = {
    layout: "root",
    middlewares: [
      {
        handler: async (_ctx: unknown, next: () => Promise<Response>) => {
          const res = await next();
          res.headers.set("X-After-Hook", "1");
          return res;
        },
      },
    ],
  };

  const route = createTestRoute("/account/overview", () =>
    Promise.resolve(reply.json({ accountId: "123" })),
  );

  const manifest = {
    layouts: {
      root: { middlewares: layout },
    },
    routes: {
      "/account/overview": {
        GET: { layoutChain: ["root"], route },
      },
    },
  } satisfies RouteManifestShape;

  return createTaserApp().context({}).create(manifest);
}

export function createStreamRoute(handler: () => Promise<Response> | Response) {
  return createTestRoute("/stream", handler);
}
