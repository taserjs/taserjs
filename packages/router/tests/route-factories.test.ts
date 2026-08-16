import { describe, expect, it } from "vitest";

import { createTaserApp, reply } from "../src/index.js";
import "./register.js";

describe("route factories", () => {
  const t = createTaserApp().context({});

  it("builds no-body routes including options and head", () => {
    const get = t.get("/hello").handler(() => reply.json({ ok: true }));
    const del = t.delete("/hello").handler(() => reply.json({ ok: true }));
    const options = t.options("/hello").handler(() => reply.noContent());
    const head = t.head("/hello").handler(() => reply.noContent());

    expect(get.method).toBe("GET");
    expect(del.method).toBe("DELETE");
    expect(options.method).toBe("OPTIONS");
    expect(head.method).toBe("HEAD");
  });

  it("builds with-body routes", () => {
    expect(t.post("/hello").handler(() => reply.json({})).method).toBe("POST");
    expect(t.put("/hello").handler(() => reply.json({})).method).toBe("PUT");
    expect(t.patch("/hello").handler(() => reply.json({})).method).toBe("PATCH");
  });

  it("builds any and all routes", () => {
    const any = t.any("/hello", ["GET", "OPTIONS"]).handler(() => reply.json({ ok: true }));
    const all = t.all("/hello").handler(() => reply.json({ ok: true }));

    expect(any.method).toBe("ANY");
    expect(any.methods).toEqual(["GET", "OPTIONS"]);
    expect(all.method).toBe("ALL");
  });

  it("exports legacy route factories from the public entry", async () => {
    const exported = await import("../src/index.js");
    expect("createAnyRoute" in exported).toBe(true);
    expect("createAllRoute" in exported).toBe(true);
    expect("createRouteBuilder" in exported).toBe(false);
  });
});
