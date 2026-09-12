import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build, createServer, type ViteDevServer } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { taser } from "../src/vite.js";

describe("vite dev server integration with @taserjs/plugin/vite", () => {
  let tempDir: string;
  let server: ViteDevServer | null = null;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-vite-int-"));
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("loads config from taserjs.config.ts and generates manifest on vite dev server startup", async () => {
    // Write custom taserjs.config.ts
    const configContent = `
export default {
  serverDir: "src",
  routesDir: "routes",
  outputDir: ".taserjs",
  formatting: { quotes: "single" },
};
`;
    writeFileSync(join(tempDir, "taserjs.config.ts"), configContent, "utf-8");

    // Write initial route
    const routeContent = `
import { t } from "@taserjs/router";
export default t.get("/health").handler(() => Response.json({ status: "ok" }));
`;
    writeFileSync(join(tempDir, "src", "routes", "health.get.ts"), routeContent, "utf-8");

    // Start Vite dev server
    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.gen.ts");

    expect(existsSync(manifestPath)).toBe(true);

    const manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain("'/health'");
  });

  it("regenerates manifest when route files are added and removed in watcher", async () => {
    const route1 = join(tempDir, "src", "routes", "one.get.ts");
    writeFileSync(
      route1,
      'import { t } from "@taserjs/router";\nexport default t.get("/one").handler(() => Response.json(1));',
      "utf-8",
    );

    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);
    let manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain('"/one"');
    expect(manifestCode).not.toContain('"/two"');

    // Simulate file addition by writing file and emitting watcher event
    const route2 = join(tempDir, "src", "routes", "two.get.ts");
    writeFileSync(
      route2,
      'import { t } from "@taserjs/router";\nexport default t.get("/two").handler(() => Response.json(2));',
      "utf-8",
    );

    // Emit event on Vite server watcher
    server.watcher.emit("add", route2);

    // Allow debounce and processing
    await new Promise((resolve) => setTimeout(resolve, 150));

    manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain('"/two"');

    // Remove route 1
    unlinkSync(route1);
    server.watcher.emit("unlink", route1);

    await new Promise((resolve) => setTimeout(resolve, 150));

    manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).not.toContain('"/one"');
    expect(manifestCode).toContain('"/two"');
  });

  it("handles file renames within routes directory", async () => {
    const oldPath = join(tempDir, "src", "routes", "initial.get.ts");
    const newPath = join(tempDir, "src", "routes", "renamed.get.ts");

    writeFileSync(
      oldPath,
      'import { t } from "@taserjs/router";\nexport default t.get("/initial").handler(() => Response.json("init"));',
      "utf-8",
    );

    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);
    let manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain('"/initial"');
    expect(manifestCode).not.toContain('"/renamed"');

    // Simulate rename: unlink old, write new, add new
    unlinkSync(oldPath);
    writeFileSync(
      newPath,
      'import { t } from "@taserjs/router";\nexport default t.get("/renamed").handler(() => Response.json("renamed"));',
      "utf-8",
    );
    server.watcher.emit("unlink", oldPath);
    server.watcher.emit("add", newPath);

    await new Promise((resolve) => setTimeout(resolve, 150));

    manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).not.toContain('"/initial"');
    expect(manifestCode).toContain('"/renamed"');
  });

  it("ignores file events inside .taserjs directory to prevent endless rebuild loops", async () => {
    const route = join(tempDir, "src", "routes", "test.get.ts");
    writeFileSync(
      route,
      'import { t } from "@taserjs/router";\nexport default t.get("/test").handler(() => Response.json("ok"));',
      "utf-8",
    );

    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);

    // Emitting change event on .taserjs/routes.gen.ts should not throw or alter contents
    expect(() => {
      server!.watcher.emit("change", manifestPath);
    }).not.toThrow();
  });

  const getViteConfig = (extra: Record<string, any> = {}) => ({
    root: tempDir,
    resolve: {
      alias: {
        "@taserjs/runtime": resolve(process.cwd(), "../runtime/src/index.ts"),
        "@taserjs/router": resolve(process.cwd(), "../router/src/index.ts"),
      },
    },
    server: {
      port: 0,
    },
    logLevel: "silent" as const,
    ...extra,
  });

  it("serves requests in standalone mode by default (server: true)", async () => {
    const routeContent = `
import { t } from "@taserjs/router";
export default t.get("/ping").handler(() => Response.json({ pong: true }));
`;
    writeFileSync(join(tempDir, "src", "routes", "ping.get.ts"), routeContent, "utf-8");

    server = await createServer(
      getViteConfig({
        plugins: [taser({ cwd: tempDir })],
      }),
    );

    await server.listen();
    const port = (server.httpServer!.address() as any).port;

    const res = await fetch(`http://localhost:${port}/ping`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ pong: true });
  });

  it("passing server: false disables dev connect middleware interception but preserves generation and watch", async () => {
    const routeContent = `
import { t } from "@taserjs/router";
export default t.get("/ping").handler(() => Response.json({ pong: true }));
`;
    writeFileSync(join(tempDir, "src", "routes", "ping.get.ts"), routeContent, "utf-8");

    server = await createServer(
      getViteConfig({
        plugins: [taser({ cwd: tempDir, server: false })],
      }),
    );

    await server.listen();
    const port = (server.httpServer!.address() as any).port;

    // Route manifest is generated
    const manifestPath = join(tempDir, "src", ".taserjs", "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);

    // Request is NOT intercepted by Taser dev middleware (falls through to Vite 404)
    const res = await fetch(`http://localhost:${port}/ping`);
    expect(res.status).toBe(404);

    // Watcher still works: adding a route regenerates manifest
    const route2 = join(tempDir, "src", "routes", "hello.get.ts");
    writeFileSync(
      route2,
      'import { t } from "@taserjs/router";\nexport default t.get("/hello").handler(() => Response.json("hi"));',
      "utf-8",
    );
    server.watcher.emit("add", route2);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain('"/hello"');
  });

  it("auto-detects fullstack plugins and deactivates dev connect middleware", async () => {
    const routeContent = `
import { t } from "@taserjs/router";
export default t.get("/ping").handler(() => Response.json({ pong: true }));
`;
    writeFileSync(join(tempDir, "src", "routes", "ping.get.ts"), routeContent, "utf-8");

    server = await createServer(
      getViteConfig({
        plugins: [
          taser({ cwd: tempDir }),
          {
            name: "tanstack-start-core:dev-server",
          },
        ],
      }),
    );

    await server.listen();
    const port = (server.httpServer!.address() as any).port;

    // Manifest is still generated
    const manifestPath = join(tempDir, "src", ".taserjs", "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);

    // Request is NOT intercepted by Taser dev middleware
    const res = await fetch(`http://localhost:${port}/ping`);
    expect(res.status).toBe(404);
  });

  it("guards against non-runnable ssr environment without throwing 500 error", async () => {
    const routeContent = `
import { t } from "@taserjs/router";
export default t.get("/ping").handler(() => Response.json({ pong: true }));
`;
    writeFileSync(join(tempDir, "src", "routes", "ping.get.ts"), routeContent, "utf-8");

    let originalConstructorName: string | undefined;
    let ssrConstructor: any;
    // Plugin simulating fullstack environment API with a FetchableDevEnvironment (no runner)
    const mockFullstackEnvPlugin = {
      name: "mock-fetchable-env-plugin",
      configureServer(s: any) {
        if (s.environments?.ssr) {
          ssrConstructor = s.environments.ssr.constructor;
          originalConstructorName = ssrConstructor.name;
          // Mutate ssr environment to act like FetchableDevEnvironment
          Object.defineProperty(s.environments.ssr, "runner", {
            get() {
              return undefined;
            },
            configurable: true,
          });
          s.environments.ssr.dispatchFetch = async () => new Response("env");
          Object.defineProperty(s.environments.ssr.constructor, "name", {
            value: "FetchableDevEnvironment",
            configurable: true,
          });
        }
      },
    };

    try {
      server = await createServer(
        getViteConfig({
          // Explicit server: true to force registration of middleware
          plugins: [taser({ cwd: tempDir, server: true }), mockFullstackEnvPlugin],
        }),
      );

      await server.listen();
      const port = (server.httpServer!.address() as any).port;

      // The defensive guard should see non-runnable ssr environment and call next(),
      // avoiding a 500 crash from ssrLoadModule
      const res = await fetch(`http://localhost:${port}/ping`);
      expect(res.status).not.toBe(500);
    } finally {
      if (ssrConstructor && originalConstructorName !== undefined) {
        Object.defineProperty(ssrConstructor, "name", {
          value: originalConstructorName,
          configurable: true,
        });
      }
    }
  });

  it("dev server falls through unmatched requests to legacy Express/Fastify host in server.node.ts across verbs", async () => {
    // 1. Taser route
    const taserRoute = `
import { t } from "@taserjs/router";
export default t.get("/health").handler(() => Response.json({ from: "taser" }));
`;
    writeFileSync(join(tempDir, "src", "routes", "health.get.ts"), taserRoute, "utf-8");

    // 2. Legacy Node server handler in src/server.node.ts
    const legacyNodeServer = `
export default function legacyHost(req, res) {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const parsedUrl = new URL(req.url, "http://localhost");
    if (parsedUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ from: "legacy-host-should-not-reach" }));
      return;
    }
    if (parsedUrl.pathname === "/legacy-api") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        method: req.method,
        receivedBody: body ? JSON.parse(body) : null,
      }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found in legacy" }));
  });
}
`;
    writeFileSync(join(tempDir, "src", "server.node.ts"), legacyNodeServer, "utf-8");

    server = await createServer(
      getViteConfig({
        plugins: [taser({ cwd: tempDir })],
      }),
    );

    await server.listen();
    const port = (server.httpServer!.address() as any).port;

    // A. Taser route takes precedence over host server
    const healthRes = await fetch(`http://localhost:${port}/health`);
    expect(healthRes.status).toBe(200);
    const healthBody = await healthRes.json();
    expect(healthBody).toEqual({ from: "taser" });

    // B. Unmatched GET falls through to host
    const getRes = await fetch(`http://localhost:${port}/legacy-api`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody).toEqual({ method: "GET", receivedBody: null });

    // C. Unmatched POST with JSON body falls through to host
    const postRes = await fetch(`http://localhost:${port}/legacy-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: "widget", count: 42 }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody).toEqual({ method: "POST", receivedBody: { item: "widget", count: 42 } });

    // D. Unmatched PUT falls through to host
    const putRes = await fetch(`http://localhost:${port}/legacy-api`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updated: true }),
    });
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody).toEqual({ method: "PUT", receivedBody: { updated: true } });

    // E. Unmatched DELETE falls through to host
    const deleteRes = await fetch(`http://localhost:${port}/legacy-api`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody).toEqual({ method: "DELETE", receivedBody: null });

    // F. Truly unhandled route falls through to host 404
    const notFoundRes = await fetch(`http://localhost:${port}/unhandled-route`);
    expect(notFoundRes.status).toBe(404);
    const notFoundBody = await notFoundRes.json();
    expect(notFoundBody).toEqual({ error: "not found in legacy" });
  });

  it("dev server falls through unmatched requests to Fetch-native host in server.ts", async () => {
    // 1. Taser route
    const taserRoute = `
import { t } from "@taserjs/router";
export default t.get("/api/v1/users").handler(() => Response.json({ users: ["Alice"] }));
`;
    mkdirSync(join(tempDir, "src", "routes", "api", "v1"), { recursive: true });
    writeFileSync(join(tempDir, "src", "routes", "api", "v1", "users.get.ts"), taserRoute, "utf-8");

    // 2. Fetch-native host server in src/server.ts
    const fetchHostServer = `
export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/v1/users") {
      return Response.json({ users: ["From Host"] });
    }
    if (url.pathname === "/host-info") {
      const body = req.method === "POST" ? await req.json() : null;
      return Response.json({ host: "fetch-native", method: req.method, body });
    }
    return new Response(JSON.stringify({ error: "host 404" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
`;
    writeFileSync(join(tempDir, "src", "server.ts"), fetchHostServer, "utf-8");

    server = await createServer(
      getViteConfig({
        plugins: [taser({ cwd: tempDir })],
      }),
    );

    await server.listen();
    const port = (server.httpServer!.address() as any).port;

    // A. Taser route takes precedence
    const userRes = await fetch(`http://localhost:${port}/api/v1/users`);
    expect(userRes.status).toBe(200);
    const userBody = await userRes.json();
    expect(userBody).toEqual({ users: ["Alice"] });

    // B. Unmatched GET falls through to Fetch host
    const hostGetRes = await fetch(`http://localhost:${port}/host-info`);
    expect(hostGetRes.status).toBe(200);
    const hostGetBody = await hostGetRes.json();
    expect(hostGetBody).toEqual({ host: "fetch-native", method: "GET", body: null });

    // C. Unmatched POST falls through to Fetch host
    const hostPostRes = await fetch(`http://localhost:${port}/host-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deploy" }),
    });
    expect(hostPostRes.status).toBe(200);
    const hostPostBody = await hostPostRes.json();
    expect(hostPostBody).toEqual({
      host: "fetch-native",
      method: "POST",
      body: { action: "deploy" },
    });

    // D. Unmatched PUT falls through to Fetch host
    const hostPutRes = await fetch(`http://localhost:${port}/host-info`, {
      method: "PUT",
    });
    expect(hostPutRes.status).toBe(200);
    const hostPutBody = await hostPutRes.json();
    expect(hostPutBody).toEqual({ host: "fetch-native", method: "PUT", body: null });

    // E. Unmatched DELETE falls through to Fetch host
    const hostDeleteRes = await fetch(`http://localhost:${port}/host-info`, {
      method: "DELETE",
    });
    expect(hostDeleteRes.status).toBe(200);
    const hostDeleteBody = await hostDeleteRes.json();
    expect(hostDeleteBody).toEqual({ host: "fetch-native", method: "DELETE", body: null });
  });

  it("production standalone SSR build generates serve.mjs binding host server fallback", async () => {
    // 1. Taser route
    const taserRoute = `
import { t } from "@taserjs/router";
export default t.get("/api/ping").handler(() => Response.json({ pong: true }));
`;
    mkdirSync(join(tempDir, "src", "routes", "api"), { recursive: true });
    writeFileSync(join(tempDir, "src", "routes", "api", "ping.get.ts"), taserRoute, "utf-8");

    // 2. Legacy server.node.ts
    const legacyNodeServer = `
export default function legacyHost(req, res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ legacy: true }));
}
`;
    writeFileSync(join(tempDir, "src", "server.node.ts"), legacyNodeServer, "utf-8");

    // Run build
    await build({
      root: tempDir,
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
      resolve: {
        alias: {
          "@taserjs/runtime": resolve(process.cwd(), "../runtime/src/index.ts"),
          "@taserjs/router": resolve(process.cwd(), "../router/src/index.ts"),
        },
      },
      build: {
        outDir: join(tempDir, "dist"),
      },
    });

    const serveShimPath = join(tempDir, "src", ".taserjs", "serve.ts");
    expect(existsSync(serveShimPath)).toBe(true);

    const shimContent = readFileSync(serveShimPath, "utf-8");
    expect(shimContent).toContain("toFetchHandler");
    expect(shimContent).toContain('app.all("*", (c) => hostFetch(c.req.raw));');
    expect(shimContent).toContain("hostServerEntry");

    const distServePath = join(tempDir, "dist", "serve.mjs");
    expect(existsSync(distServePath)).toBe(true);
    const distContent = readFileSync(distServePath, "utf-8");
    expect(distContent).toContain("app.all");
  });
});
