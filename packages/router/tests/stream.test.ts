import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createTaserApp, type RouteManifestShape } from "../src/index.js";
import { blob, buffer, file, pipe, stream } from "../src/stream.js";

describe("router stream export", () => {
  it("serves file stream from route handler", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taser-router-stream-"));
    const path = join(dir, "data.json");
    await writeFile(path, JSON.stringify({ message: "streamed from file" }));

    const t = createTaserApp();
    const route = t.get("/file").handler(() => file(path));
    const manifest = {
      layouts: {},
      routes: {
        "/file": { GET: { layoutChain: [], route } },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const response = await app.fetch(new Request("http://localhost/file"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ message: "streamed from file" });
  });

  it("serves pipe stream from route handler", async () => {
    const t = createTaserApp();
    const route = t.get("/pipe").handler(() =>
      pipe(Readable.toWeb(Readable.from([Buffer.from("piped-stream-data")])) as ReadableStream, {
        headers: { "content-type": "text/plain" },
      }),
    );
    const manifest = {
      layouts: {},
      routes: {
        "/pipe": { GET: { layoutChain: [], route } },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const response = await app.fetch(new Request("http://localhost/pipe"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("piped-stream-data");
  });

  it("serves buffer from route handler", async () => {
    const t = createTaserApp();
    const route = t.get("/buffer").handler(() => buffer(Buffer.from("binary-stream")));
    const manifest = {
      layouts: {},
      routes: {
        "/buffer": { GET: { layoutChain: [], route } },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const response = await app.fetch(new Request("http://localhost/buffer"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(await response.text()).toBe("binary-stream");
  });

  it("serves blob from route handler", async () => {
    const t = createTaserApp();
    const route = t
      .get("/blob")
      .handler(() => blob(new Blob(["blob data"], { type: "text/html" })));
    const manifest = {
      layouts: {},
      routes: {
        "/blob": { GET: { layoutChain: [], route } },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const response = await app.fetch(new Request("http://localhost/blob"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
    expect(await response.text()).toBe("blob data");
  });

  it("supports direct functions from stream subpath", () => {
    expect(typeof file).toBe("function");
    expect(typeof pipe).toBe("function");
    expect(typeof buffer).toBe("function");
    expect(typeof blob).toBe("function");
    expect(typeof stream.file).toBe("function");
    expect(typeof stream.pipe).toBe("function");
    expect(typeof stream.buffer).toBe("function");
    expect(typeof stream.blob).toBe("function");
  });
});
