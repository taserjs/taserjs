import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { mountNodeHost } from "../src/serve-node.js";
import { mountFetchHost } from "../src/serve.js";

const request = (app: Hono, path: string) => app.request(`http://localhost${path}`);

describe("host server mounting", () => {
  it.each([
    ["an object", { fetch: () => new Response("host") }],
    ["a function", () => new Response("host")],
    ["a module default", { default: { fetch: () => new Response("host") } }],
  ])("mounts a fetch host given as %s", async (_form, host) => {
    const app = new Hono();
    mountFetchHost(app, host);

    expect(await (await request(app, "/anything")).text()).toBe("host");
  });

  it("keeps app routes ahead of the host fallback", async () => {
    const app = new Hono().get("/mine", (c) => c.text("app"));
    mountFetchHost(app, () => new Response("host"));

    expect(await (await request(app, "/mine")).text()).toBe("app");
    expect(await (await request(app, "/other")).text()).toBe("host");
  });

  const listener = (_req: unknown, res: { end(body: string): void }) => res.end("node");

  it.each([
    ["a request listener", listener],
    ["a Fastify-style routing handler", { routing: listener }],
    ["a module default", { default: listener }],
  ])("mounts a node host given as %s", async (_form, host) => {
    const app = new Hono();
    mountNodeHost(app, host);

    expect(await (await request(app, "/anything")).text()).toBe("node");
  });

  it.each([undefined, {}, "nope"])("ignores an unusable host %j", async (host) => {
    const app = new Hono();
    mountFetchHost(app, host);
    mountNodeHost(app, host);

    expect((await request(app, "/anything")).status).toBe(404);
  });
});
