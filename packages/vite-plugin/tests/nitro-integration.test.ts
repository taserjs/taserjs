import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join, resolve } from "pathe";
import { tmpdir } from "node:os";
import { createNitro, build } from "nitro/builder";
import { taserNitro } from "../src/nitro.js";

const routerEntryPath = resolve(process.cwd(), "../router/src/index.ts");
const routerReplyPath = resolve(process.cwd(), "../router/src/reply.ts");

describe("Nitro + Taser Integration", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fsp.mkdtemp(join(tmpdir(), "taser-nitro-int-"));
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  it("Scenario 1: Pure Taser build with synthesized entry (no server.ts)", async () => {
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp();
`,
    );

    await fsp.writeFile(
      join(routesDir, "hello.get.ts"),
      `import { t } from "../taser.js";
import { json } from "@taserjs/router/reply";
export const Route = t.get("/hello").handler(() => json({ message: "hello from taser" }));
`,
    );

    const nitro = await createNitro({
      rootDir: testDir,
      preset: "cloudflare-module",
      alias: {
        "@taserjs/router/reply": routerReplyPath,
        "@taserjs/router": routerEntryPath,
      },
      output: {
        dir: join(testDir, ".output"),
      },
      modules: [
        taserNitro({
          rootDir: testDir,
          routesDir: "routes",
          taserAppPath: "./taser.ts",
        }),
      ],
    });

    await build(nitro);

    const entryPath = join(testDir, ".output", "server", "index.mjs");
    const serverModule = await import(entryPath);
    const fetchHandler = serverModule.default?.fetch || serverModule.fetch || serverModule.default;
    const fetch = (req: Request) =>
      fetchHandler(req, {
        ASSETS: {
          fetch: () => new Response(null, { status: 404 }),
        },
      });

    // Matched route
    const res = await fetch(new Request("http://localhost/hello"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ message: "hello from taser" });
  });

  it("Scenario 2: Root scope + server.ts host app fall-through", async () => {
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    // Host server.ts
    await fsp.writeFile(
      join(testDir, "server.ts"),
      `export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname === "/host-route") {
      return new Response(JSON.stringify({ from: "host" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }
};
`,
    );

    // Taser app with passThroughOnMiss
    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp({ passThroughOnMiss: true });
`,
    );

    await fsp.writeFile(
      join(routesDir, "taser-route.get.ts"),
      `import { t } from "../taser.js";
import { json } from "@taserjs/router/reply";
export const Route = t.get("/taser-route").handler(() => json({ from: "taser" }));
`,
    );

    const nitro = await createNitro({
      rootDir: testDir,
      preset: "cloudflare-module",
      alias: {
        "@taserjs/router/reply": routerReplyPath,
        "@taserjs/router": routerEntryPath,
      },
      output: {
        dir: join(testDir, ".output"),
      },
      modules: [
        taserNitro({
          rootDir: testDir,
          routesDir: "routes",
          taserAppPath: "./taser.ts",
        }),
      ],
    });

    await build(nitro);

    const entryPath = join(testDir, ".output", "server", "index.mjs");
    const serverModule = await import(entryPath);
    const fetchHandler = serverModule.default?.fetch || serverModule.fetch || serverModule.default;
    const fetch = (req: Request) =>
      fetchHandler(req, {
        ASSETS: {
          fetch: () => new Response(null, { status: 404 }),
        },
      });

    // 1. Taser route handled by Taser
    const taserRes = await fetch(new Request("http://localhost/taser-route"));
    expect(taserRes.status).toBe(200);
    expect(await taserRes.json()).toEqual({ from: "taser" });

    // 2. Miss in Taser falls through to server.ts host route
    const hostRes = await fetch(new Request("http://localhost/host-route"));
    expect(hostRes.status).toBe(200);
    expect(await hostRes.json()).toEqual({ from: "host" });
  });

  it("Scenario 3: Scoped mounting (basePath: /api) inside Nitro claims scope", async () => {
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    // Host server.ts
    await fsp.writeFile(
      join(testDir, "server.ts"),
      `export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname === "/host-endpoint") {
      return new Response(JSON.stringify({ from: "host" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }
};
`,
    );

    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp({ basePath: "/api" });
`,
    );

    await fsp.writeFile(
      join(routesDir, "users.get.ts"),
      `import { t } from "../taser.js";
import { json } from "@taserjs/router/reply";
export const Route = t.get("/users").handler(() => json({ users: ["alice", "bob"] }));
`,
    );

    const nitro = await createNitro({
      rootDir: testDir,
      preset: "cloudflare-module",
      alias: {
        "@taserjs/router/reply": routerReplyPath,
        "@taserjs/router": routerEntryPath,
      },
      output: {
        dir: join(testDir, ".output"),
      },
      modules: [
        taserNitro({
          rootDir: testDir,
          routesDir: "routes",
          basePath: "/api",
          taserAppPath: "./taser.ts",
        }),
      ],
    });

    await build(nitro);

    const entryPath = join(testDir, ".output", "server", "index.mjs");
    const serverModule = await import(entryPath);
    const fetchHandler = serverModule.default?.fetch || serverModule.fetch || serverModule.default;
    const fetch = (req: Request) =>
      fetchHandler(req, {
        ASSETS: {
          fetch: () => new Response(null, { status: 404 }),
        },
      });

    // Route within scope
    const apiRes = await fetch(new Request("http://localhost/api/users"));
    expect(apiRes.status).toBe(200);
    const body = await apiRes.json();
    expect(body).toEqual({ users: ["alice", "bob"] });

    // Miss within scope -> Taser claims it and returns 404
    const notFoundRes = await fetch(new Request("http://localhost/api/unknown-endpoint"));
    expect(notFoundRes.status).toBe(404);

    // Outside scope -> Handled by server.ts host
    const hostRes = await fetch(new Request("http://localhost/host-endpoint"));
    expect(hostRes.status).toBe(200);
    expect(await hostRes.json()).toEqual({ from: "host" });
  });

  it("Scenario 4: Root scope multi-method fall-through and global 404", async () => {
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    // Host server.ts handling POST /host-create and GET /host-info
    await fsp.writeFile(
      join(testDir, "server.ts"),
      `export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname === "/host-create" && req.method === "POST") {
      const data = await req.json();
      return new Response(JSON.stringify({ created: true, data }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.pathname === "/host-info" && req.method === "GET") {
      return new Response(JSON.stringify({ info: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    );

    // Taser app with passThroughOnMiss
    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp({ passThroughOnMiss: true });
`,
    );

    await fsp.writeFile(
      join(routesDir, "taser-route.get.ts"),
      `import { t } from "../taser.js";
import { json } from "@taserjs/router/reply";
export const Route = t.get("/taser-route").handler(() => json({ from: "taser" }));
`,
    );

    const nitro = await createNitro({
      rootDir: testDir,
      preset: "cloudflare-module",
      alias: {
        "@taserjs/router/reply": routerReplyPath,
        "@taserjs/router": routerEntryPath,
      },
      output: {
        dir: join(testDir, ".output"),
      },
      modules: [
        taserNitro({
          rootDir: testDir,
          routesDir: "routes",
          taserAppPath: "./taser.ts",
        }),
      ],
    });

    await build(nitro);

    const entryPath = join(testDir, ".output", "server", "index.mjs");
    const serverModule = await import(entryPath);
    const fetchHandler = serverModule.default?.fetch || serverModule.fetch || serverModule.default;
    const fetch = (req: Request) =>
      fetchHandler(req, {
        ASSETS: {
          fetch: () => new Response(null, { status: 404 }),
        },
      });

    // 1. Taser route handled by Taser
    const taserRes = await fetch(new Request("http://localhost/taser-route"));
    expect(taserRes.status).toBe(200);
    expect(await taserRes.json()).toEqual({ from: "taser" });

    // 2. Miss in Taser falls through to host POST
    const hostPostRes = await fetch(
      new Request("http://localhost/host-create", {
        method: "POST",
        body: JSON.stringify({ name: "item1" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(hostPostRes.status).toBe(200);
    expect(await hostPostRes.json()).toEqual({ created: true, data: { name: "item1" } });

    // 3. Miss in Taser falls through to host GET
    const hostGetRes = await fetch(new Request("http://localhost/host-info"));
    expect(hostGetRes.status).toBe(200);
    expect(await hostGetRes.json()).toEqual({ info: "ok" });

    // 4. Miss in both returns Nitro 404
    const neitherRes = await fetch(new Request("http://localhost/non-existent"));
    expect(neitherRes.status).toBe(404);
  });

  it("Scenario 5: Nitro baseURL (/api) automatically scopes Taser routes and redirects non-base requests", async () => {
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp();
`,
    );

    await fsp.writeFile(
      join(routesDir, "hello.get.ts"),
      `import { t } from "../taser.js";
import { json } from "@taserjs/router/reply";
export const Route = t.get("/hello").handler(() => json({ message: "hello from api" }));
`,
    );

    const nitro = await createNitro({
      rootDir: testDir,
      baseURL: "/api",
      preset: "cloudflare-module",
      alias: {
        "@taserjs/router/reply": routerReplyPath,
        "@taserjs/router": routerEntryPath,
      },
      output: {
        dir: join(testDir, ".output"),
      },
      modules: [
        taserNitro({
          rootDir: testDir,
          routesDir: "routes",
          taserAppPath: "./taser.ts",
        }),
      ],
    });

    await build(nitro);

    const entryPath = join(testDir, ".output", "server", "index.mjs");
    const serverModule = await import(entryPath);
    const fetchHandler = serverModule.default?.fetch || serverModule.fetch || serverModule.default;
    const fetch = (req: Request) =>
      fetchHandler(req, {
        ASSETS: {
          fetch: () => new Response(null, { status: 404 }),
        },
      });

    // 1. Matched route within /api
    const apiRes = await fetch(new Request("http://localhost/api/hello"));
    expect(apiRes.status).toBe(200);
    expect(await apiRes.json()).toEqual({ message: "hello from api" });

    // 2. Request outside /api is 302 redirected to /api prefix
    const redirectRes = await fetch(new Request("http://localhost/hello"));
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers.get("location")).toBe("/api/hello");

    const rootRedirectRes = await fetch(new Request("http://localhost/"));
    expect(rootRedirectRes.status).toBe(302);
    expect(rootRedirectRes.headers.get("location")).toBe("/api/");
  });

  it("Scenario 6: Nitro baseURL (/api) + Taser basePath (/v1) composes to /api/v1", async () => {
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp({ basePath: "/v1" });
`,
    );

    await fsp.writeFile(
      join(routesDir, "users.get.ts"),
      `import { t } from "../taser.js";
import { json } from "@taserjs/router/reply";
export const Route = t.get("/users").handler(() => json({ users: ["charlie"] }));
`,
    );

    const nitro = await createNitro({
      rootDir: testDir,
      baseURL: "/api",
      preset: "cloudflare-module",
      alias: {
        "@taserjs/router/reply": routerReplyPath,
        "@taserjs/router": routerEntryPath,
      },
      output: {
        dir: join(testDir, ".output"),
      },
      modules: [
        taserNitro({
          rootDir: testDir,
          routesDir: "routes",
          basePath: "/v1",
          taserAppPath: "./taser.ts",
        }),
      ],
    });

    await build(nitro);

    const entryPath = join(testDir, ".output", "server", "index.mjs");
    const serverModule = await import(entryPath);
    const fetchHandler = serverModule.default?.fetch || serverModule.fetch || serverModule.default;
    const fetch = (req: Request) =>
      fetchHandler(req, {
        ASSETS: {
          fetch: () => new Response(null, { status: 404 }),
        },
      });

    // 1. Matched route within /api/v1
    const apiRes = await fetch(new Request("http://localhost/api/v1/users"));
    expect(apiRes.status).toBe(200);
    expect(await apiRes.json()).toEqual({ users: ["charlie"] });

    // 2. Request to /v1/users (missing /api base) redirects to /api/v1/users
    const redirectRes = await fetch(new Request("http://localhost/v1/users"));
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers.get("location")).toBe("/api/v1/users");
  });
});
