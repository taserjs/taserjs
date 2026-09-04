import { bench, describe } from "vitest";
import { z } from "zod";
import { json } from "@taserjs/router-utils/reply";
import { timing } from "hono/timing";
import { createTaserCompatHandler, createTaserRuntime } from "../src/index.js";

const bodySchema = z.object({ name: z.string() });
const formSchema = z.object({ name: z.string(), email: z.string() });
const multipartSchema = z.object({ title: z.string() });

// Middleware definitions
const passthroughMw = { handler: async (_ctx: any, next: any) => next() };
const stateMw = {
  handler: async (_ctx: any, next: any) => next({ user: "alice", role: "admin" }),
};
const layoutStateMw = {
  handler: async (_ctx: any, next: any) => next({ layoutActive: true }),
};
const honoTimingMw = { handler: createTaserCompatHandler(timing()) };

// Manifests
const manifests = {
  "get-simple": {
    layouts: {},
    routes: {
      "/hello": {
        GET: {
          layouts: [],
          route: {
            path: "/hello",
            method: "GET",
            middlewares: [],
            handler: () => json({ ok: true }),
          },
        },
      },
    },
  },
  "get-1mw": {
    layouts: {},
    routes: {
      "/hello": {
        GET: {
          layouts: [],
          route: {
            path: "/hello",
            method: "GET",
            middlewares: [passthroughMw],
            handler: () => json({ ok: true }),
          },
        },
      },
    },
  },
  "get-3mw": {
    layouts: {},
    routes: {
      "/hello": {
        GET: {
          layouts: [],
          route: {
            path: "/hello",
            method: "GET",
            middlewares: [passthroughMw, passthroughMw, passthroughMw],
            handler: () => json({ ok: true }),
          },
        },
      },
    },
  },
  "mw-with-state": {
    layouts: {},
    routes: {
      "/hello": {
        GET: {
          layouts: [],
          route: {
            path: "/hello",
            method: "GET",
            middlewares: [stateMw],
            handler: (ctx: any) => json({ user: ctx.state.user }),
          },
        },
      },
    },
  },
  "layout-mw-with-state": {
    layouts: {
      root: { middlewares: { middlewares: [layoutStateMw] } },
    },
    routes: {
      "/hello": {
        GET: {
          layouts: ["root"],
          route: {
            path: "/hello",
            method: "GET",
            middlewares: [stateMw],
            handler: (ctx: any) => json({ user: ctx.state.user, layout: ctx.state.layoutActive }),
          },
        },
      },
    },
  },
  "post-no-body-schema": {
    layouts: {},
    routes: {
      "/items": {
        POST: {
          layouts: [],
          route: {
            path: "/items",
            method: "POST",
            middlewares: [],
            handler: () => json({ ok: true }),
          },
        },
      },
    },
  },
  "post-with-body-schema": {
    layouts: {},
    routes: {
      "/items": {
        POST: {
          layouts: [],
          route: {
            path: "/items",
            method: "POST",
            body: bodySchema,
            middlewares: [],
            handler: (ctx: any) => json({ name: ctx.body.name }),
          },
        },
      },
    },
  },
  "post-form-with-schema": {
    layouts: {},
    routes: {
      "/form": {
        POST: {
          layouts: [],
          route: {
            path: "/form",
            method: "POST",
            bodyMode: "urlencoded" as const,
            body: formSchema,
            middlewares: [],
            handler: (ctx: any) => json({ name: ctx.body.name }),
          },
        },
      },
    },
  },
  "post-multipart-with-schema": {
    layouts: {},
    routes: {
      "/upload": {
        POST: {
          layouts: [],
          route: {
            path: "/upload",
            method: "POST",
            bodyMode: "form" as const,
            body: multipartSchema,
            middlewares: [],
            handler: (ctx: any) => json({ title: ctx.body.title }),
          },
        },
      },
    },
  },
  "get-params": {
    layouts: {},
    routes: {
      "/user/:userId/posts/:postId": {
        GET: {
          layouts: [],
          route: {
            path: "/user/:userId/posts/:postId",
            method: "GET",
            middlewares: [],
            handler: (ctx: any) => json({ userId: ctx.params.userId }),
          },
        },
      },
    },
  },
  "hono-mw-1": {
    layouts: {
      root: { middlewares: { middlewares: [honoTimingMw] } },
    },
    routes: {
      "/hello": {
        GET: {
          layouts: ["root"],
          route: {
            path: "/hello",
            method: "GET",
            middlewares: [],
            handler: () => json({ ok: true }),
          },
        },
      },
    },
  },
};

// Runtime instances
const rSimple = createTaserRuntime(manifests["get-simple"], () => ({}));
const r1Mw = createTaserRuntime(manifests["get-1mw"], () => ({}));
const r3Mw = createTaserRuntime(manifests["get-3mw"], () => ({}));
const rMwState = createTaserRuntime(manifests["mw-with-state"], () => ({}));
const rLayoutState = createTaserRuntime(manifests["layout-mw-with-state"], () => ({}));
const rPostNoBody = createTaserRuntime(manifests["post-no-body-schema"], () => ({}));
const rPostBody = createTaserRuntime(manifests["post-with-body-schema"], () => ({}));
const rPostForm = createTaserRuntime(manifests["post-form-with-schema"], () => ({}));
const rPostMultipart = createTaserRuntime(manifests["post-multipart-with-schema"], () => ({}));
const rGetParams = createTaserRuntime(manifests["get-params"], () => ({}));
const rHonoMw = createTaserRuntime(manifests["hono-mw-1"], () => ({}));

// Request Payloads
const jsonPayload = JSON.stringify({ name: "bench" });
const formPayload = "name=bench&email=bench%40example.com";
const multipartBoundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
const multipartPayload =
  `--${multipartBoundary}\r\n` +
  `Content-Disposition: form-data; name="title"\r\n\r\n` +
  `bench-title\r\n` +
  `--${multipartBoundary}--\r\n`;

const options = { iterations: 1000, warmupIterations: 100, time: 5000, warmupTime: 500 };

describe("Taser Runtime Benchmarks", () => {
  bench(
    "get-simple",
    async () => {
      await rSimple.request("/hello");
    },
    options,
  );

  bench(
    "get-1mw",
    async () => {
      await r1Mw.request("/hello");
    },
    options,
  );

  bench(
    "get-3mw",
    async () => {
      await r3Mw.request("/hello");
    },
    options,
  );

  bench(
    "mw-with-state",
    async () => {
      await rMwState.request("/hello");
    },
    options,
  );

  bench(
    "layout-mw-with-state",
    async () => {
      await rLayoutState.request("/hello");
    },
    options,
  );

  bench(
    "post-no-body-schema",
    async () => {
      await rPostNoBody.request("/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: jsonPayload,
      });
    },
    options,
  );

  bench(
    "post-with-body-schema",
    async () => {
      await rPostBody.request("/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: jsonPayload,
      });
    },
    options,
  );

  bench(
    "post-form-with-schema",
    async () => {
      await rPostForm.request("/form", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: formPayload,
      });
    },
    options,
  );

  bench(
    "post-multipart-with-schema",
    async () => {
      await rPostMultipart.request("/upload", {
        method: "POST",
        headers: {
          "content-type": `multipart/form-data; boundary=${multipartBoundary}`,
        },
        body: multipartPayload,
      });
    },
    options,
  );

  bench(
    "get-params",
    async () => {
      await rGetParams.request("/user/usr_12345/posts/post_67890");
    },
    options,
  );

  bench(
    "hono-mw-1",
    async () => {
      await rHonoMw.request("/hello");
    },
    options,
  );
});
