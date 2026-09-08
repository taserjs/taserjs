import { describe, it, expect } from "vitest";
import { t } from "@taserjs/router";
import { json } from "@taserjs/utils";
import { createContext, createTaserApp } from "../src/index.js";

describe("createContext & context resolution", () => {
  it("evaluates boot singleton once and resolves request context per request", async () => {
    let bootCalls = 0;
    let requestCalls = 0;

    const context = createContext({
      boot: async () => {
        bootCalls++;
        return {
          db: { connected: true, instanceId: "db-1" },
        };
      },
      request: (req) => {
        requestCalls++;
        return {
          requestId: req.headers.get("x-request-id") ?? "default-id",
        };
      },
    });

    const route = t.get("/test").handler(({ ctx }) => {
      return json({
        db: ctx.db,
        requestId: ctx.requestId,
      });
    });

    const app = createTaserApp(
      {
        routes: {
          "/test": {
            GET: {
              route,
            },
          },
        },
      },
      { context },
    );

    const res1 = await app.request("/test", {
      headers: { "x-request-id": "req-1" },
    });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1).toEqual({
      db: { connected: true, instanceId: "db-1" },
      requestId: "req-1",
    });

    const res2 = await app.request("/test", {
      headers: { "x-request-id": "req-2" },
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2).toEqual({
      db: { connected: true, instanceId: "db-1" },
      requestId: "req-2",
    });

    expect(bootCalls).toBe(1);
    expect(requestCalls).toBe(2);
  });

  it("exposes underlying Hono context on ctx.context", async () => {
    let capturedHonoContext: unknown = null;

    const route = t.get("/escape").handler(({ ctx }) => {
      capturedHonoContext = ctx.context;
      return json({ ok: true });
    });

    const app = createTaserApp({
      routes: {
        "/escape": {
          GET: {
            route,
          },
        },
      },
    });

    const res = await app.request("/escape");
    expect(res.status).toBe(200);
    expect(capturedHonoContext).toBeDefined();
    expect((capturedHonoContext as { req?: unknown }).req).toBeDefined();
  });
});
