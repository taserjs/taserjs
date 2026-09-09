import { describe, it, expect } from "vitest";
import { createPipeline } from "../src/index.js";
import type { MiddlewareHandler, TaserRequest } from "../src/index.js";

function createDummyRequest(): TaserRequest {
  const raw = new Request("http://localhost/test");
  return {
    params: {},
    query: {},
    headers: raw.headers,
    method: "GET",
    url: raw.url,
    raw,
  };
}

describe("createPipeline (onion execution pipeline)", () => {
  it("executes middlewares and terminal handler in onion order", async () => {
    const trace: string[] = [];

    const mw1: MiddlewareHandler = async (_args, next) => {
      trace.push("mw1:enter");
      const res = await next();
      trace.push("mw1:exit");
      return res;
    };

    const mw2: MiddlewareHandler = async (_args, next) => {
      trace.push("mw2:enter");
      const res = await next();
      trace.push("mw2:exit");
      return res;
    };

    const handler = async () => {
      trace.push("handler");
      return new Response("ok");
    };

    const pipeline = createPipeline([mw1, mw2], handler);
    const res = await pipeline(createDummyRequest(), {});

    expect(res.status).toBe(200);
    expect(trace).toEqual(["mw1:enter", "mw2:enter", "handler", "mw2:exit", "mw1:exit"]);
  });

  it("accumulates state across middleware layers via next(state)", async () => {
    let capturedState: Record<string, unknown> = {};

    const mw1: MiddlewareHandler = async (_args, next) => {
      return next({ layer1: "foo" });
    };

    const mw2: MiddlewareHandler = async (_args, next) => {
      return next({ layer2: "bar" });
    };

    const mw3: MiddlewareHandler = async (_args, next) => {
      // next() without args preserves accumulated state
      return next();
    };

    const handler = async ({ state }: { state: Record<string, unknown> }) => {
      capturedState = state;
      return new Response("ok");
    };

    const pipeline = createPipeline([mw1, mw2, mw3], handler);
    await pipeline(createDummyRequest(), {});

    expect(capturedState).toEqual({
      layer1: "foo",
      layer2: "bar",
    });
  });

  it("supports early Response return short-circuiting", async () => {
    const trace: string[] = [];

    const mw1: MiddlewareHandler = async (_args, next) => {
      trace.push("mw1");
      return next();
    };

    const mw2: MiddlewareHandler = async () => {
      trace.push("mw2:short-circuit");
      return new Response("blocked", { status: 403 });
    };

    const mw3: MiddlewareHandler = async (_args, next) => {
      trace.push("mw3");
      return next();
    };

    const handler = async () => {
      trace.push("handler");
      return new Response("ok");
    };

    const pipeline = createPipeline([mw1, mw2, mw3], handler);
    const res = await pipeline(createDummyRequest(), {});

    expect(res.status).toBe(403);
    expect(await res.text()).toBe("blocked");
    expect(trace).toEqual(["mw1", "mw2:short-circuit"]);
  });

  it("supports response inspection and header mutation during unwinding", async () => {
    const mw1: MiddlewareHandler = async (_args, next) => {
      const res = await next();
      res.headers.set("X-Pipeline-Root", "applied");
      return res;
    };

    const mw2: MiddlewareHandler = async (_args, next) => {
      const res = await next();
      res.headers.set("X-Pipeline-Child", "applied");
      return res;
    };

    const handler = async () => {
      return new Response("hello", {
        headers: { "X-Handler": "true" },
      });
    };

    const pipeline = createPipeline([mw1, mw2], handler);
    const res = await pipeline(createDummyRequest(), {});

    expect(res.headers.get("X-Handler")).toBe("true");
    expect(res.headers.get("X-Pipeline-Child")).toBe("applied");
    expect(res.headers.get("X-Pipeline-Root")).toBe("applied");
  });

  it("bubbles errors up through outer layers and out of pipeline", async () => {
    const trace: string[] = [];

    const mw1: MiddlewareHandler = async (_args, next) => {
      try {
        return await next();
      } catch (err) {
        trace.push(`caught:${(err as Error).message}`);
        throw err;
      }
    };

    const handler = async () => {
      throw new Error("unhandled handler failure");
    };

    const pipeline = createPipeline([mw1], handler);

    await expect(pipeline(createDummyRequest(), {})).rejects.toThrow("unhandled handler failure");
    expect(trace).toEqual(["caught:unhandled handler failure"]);
  });

  it("allows outer middleware to intercept and handle error into Response", async () => {
    const mw1: MiddlewareHandler = async (_args, next) => {
      try {
        return await next();
      } catch (err) {
        return new Response(`recovered: ${(err as Error).message}`, { status: 500 });
      }
    };

    const handler = async () => {
      throw new Error("crash");
    };

    const pipeline = createPipeline([mw1], handler);
    const res = await pipeline(createDummyRequest(), {});

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("recovered: crash");
  });

  it("throws if next() is called multiple times", async () => {
    const faultyMw: MiddlewareHandler = async (_args, next) => {
      await next();
      return await next();
    };

    const pipeline = createPipeline([faultyMw], async () => new Response("ok"));

    await expect(pipeline(createDummyRequest(), {})).rejects.toThrow(
      "next() called multiple times",
    );
  });
});
