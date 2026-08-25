import { describe, expect, it, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

import { getComposedAppCode } from "../src/core/compose.js";

/**
 * Loads the REAL generated compose output with its virtual specifiers rewired
 * to local stub files, then executes the handler. Validates the host contract
 * behavior end-to-end: dispatch order, host shapes, and the 404 fallthrough.
 */
async function loadComposedApp(hostModuleSource: string | undefined) {
  const dir = await fsp.mkdtemp(join(tmpdir(), "taser-compose-e2e-"));

  await fsp.writeFile(
    join(dir, "entry.mjs"),
    `export default async (req) =>
      new URL(req.url).pathname === "/taser" ? new Response("from-taser") : undefined;
`,
  );

  if (hostModuleSource !== undefined) {
    await fsp.writeFile(join(dir, "host.mjs"), hostModuleSource);
  }

  const raw =
    hostModuleSource === undefined
      ? getComposedAppCode({ scope: "/" })
      : getComposedAppCode({ serverEntrySpecifier: "./host.mjs", scope: "/" });

  const code = raw.replace(`"#taserjs/virtual/entry"`, `"./entry.mjs"`);
  await fsp.writeFile(join(dir, "app.mjs"), code);

  const mod = (await import(pathToFileURL(join(dir, "app.mjs")).href)) as {
    handler: (req: Request) => Promise<Response | undefined>;
  };

  return {
    handler: mod.handler,
    async close() {
      await fsp.rm(dir, { recursive: true, force: true });
    },
  };
}

const get = (path: string) => new Request(`http://localhost${path}`);

describe("composed app × host contract (evaluated)", () => {
  let app: Awaited<ReturnType<typeof loadComposedApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it("taser routes win over the host", async () => {
    app = await loadComposedApp(`export default { fetch: async () => new Response("from-host") };`);
    const res = await app.handler(get("/taser"));
    expect(await res?.text()).toBe("from-taser");
  });

  it("fetch-native hosts answer taser misses", async () => {
    app = await loadComposedApp(`export default { fetch: async () => new Response("from-host") };`);
    const res = await app.handler(get("/host-route"));
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe("from-host");
  });

  it("explicit { node } hosts answer taser misses", async () => {
    app = await loadComposedApp(`
export default {
  node: (req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/plain");
    res.end("from-node-host");
  },
};
`);
    const res = await app.handler(get("/host-route"));
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe("from-node-host");
  });

  it("bare node-style functions are auto-wrapped (heuristic)", async () => {
    app = await loadComposedApp(`
const app = (req, res) => {
  res.statusCode = 200;
  res.end("bare-express");
};
export default app;
`);
    const res = await app.handler(get("/host-route"));
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe("bare-express");
  });

  it("fastify convention (await ready; export default app.routing) is bridged", async () => {
    app = await loadComposedApp(`
const app = { ready: () => Promise.resolve() };
await app.ready();

export default function routing(req, res) {
  res.statusCode = 200;
  res.end("from-fastify-routing");
}
`);
    const res = await app.handler(get("/host-route"));
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe("from-fastify-routing");
  });

  it("unrecognizable host exports degrade to the 404 fallthrough", async () => {
    app = await loadComposedApp(`
// A bare Fastify instance (not the documented convention): not callable and
// exposes no fetch/node — intentionally falls through to Taser's 404.
const app = { ready: () => Promise.resolve(), routing: (req, res) => {} };
export default app;
`);
    const res = await app.handler(get("/nope"));
    expect(res?.status).toBe(404);
  });

  it("404s when there is no host at all", async () => {
    app = await loadComposedApp(undefined);
    const res = await app.handler(get("/nope"));
    expect(res?.status).toBe(404);
  });
});
