import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { createNitro, build } from "nitro/builder";
import { taser as taserNitro } from "../src/nitro.js";

const routerEntryPath = join(process.cwd(), "../router/dist/esm/index.js");
const routerReplyPath = join(process.cwd(), "../router/dist/esm/reply.js");

describe("nitro-integration (Nitro Only Mode)", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fsp.mkdtemp(join(tmpdir(), "taser-nitro-int-test-"));
  });

  afterEach(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // oxlint-disable-next-line no-await-in-loop
        await fsp.rm(testDir, { recursive: true, force: true });
        return;
      } catch {
        // oxlint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  });

  it("builds a standalone Nitro app with taser module", async () => {
    const srcDir = join(testDir, "src");
    const routesDir = join(srcDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    await fsp.writeFile(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "test-app",
        type: "module",
        imports: {
          "#taserjs/router": "./src/taser.ts",
        },
      }),
    );

    await fsp.writeFile(
      join(srcDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp();
`,
    );

    await fsp.writeFile(
      join(routesDir, "hello.get.ts"),
      `import { t } from "../taser.js";
import { json } from "@taserjs/router/reply";
export const Route = t.get("/hello").handler(() => json({ message: "hello from nitro only" }));
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

    const res = await fetch(new Request("http://localhost/hello"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "hello from nitro only" });
  });

  it("composes Nitro baseURL and Taser basePath correctly", async () => {
    const srcDir = join(testDir, "src");
    const routesDir = join(srcDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    await fsp.writeFile(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "test-app",
        type: "module",
        imports: {
          "#taserjs/router": "./src/taser.ts",
        },
      }),
    );

    await fsp.writeFile(
      join(srcDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp();
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
          basePath: "/v1",
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

    const res = await fetch(new Request("http://localhost/api/v1/users"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: ["alice", "bob"] });
  });
});
