import { ValidationError } from "@taserjs/utils";
import type { Context } from "hono";
import { describe, it, expect, vi } from "vitest";

import { createPipeline } from "../src/pipeline.js";
import type { MiddlewareHandler, TaserRequest } from "../src/types.js";

function createDummyRequest(): TaserRequest {
  const raw = new Request("http://localhost/test");
  return {
    params: {},
    query: {},
    body: undefined,
    headers: raw.headers,
    method: "GET",
    url: raw.url,
    path: new URL(raw.url).pathname,
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

  it("injects services via next.provide as top-level destructured siblings", async () => {
    let capturedArgs: Record<string, unknown> = {};

    const mw1: MiddlewareHandler = async (_args, next) => {
      return next.provide({ myService: { name: "service-1" } });
    };

    const handler = async (args: {
      req: TaserRequest;
      ctx: Record<string, unknown>;
      state: Record<string, unknown>;
      myService?: { name: string };
    }) => {
      capturedArgs = args;
      return new Response("ok");
    };

    const pipeline = createPipeline([mw1], handler as any);
    await pipeline(createDummyRequest(), {});

    expect(capturedArgs.myService).toEqual({ name: "service-1" });
    expect(capturedArgs.req).toBeDefined();
    expect(capturedArgs.ctx).toBeDefined();
    expect(capturedArgs.state).toEqual({});
  });

  it("cascades provided services across middleware layers and preserves existing state", async () => {
    let capturedChildMwServices: unknown;
    let capturedHandlerArgs: Record<string, unknown> = {};

    const mw1: MiddlewareHandler = async (_args, next) => {
      return next.provide({ serviceA: "alpha" }, { user: "alice" });
    };

    const mw2: MiddlewareHandler = async (args, next) => {
      capturedChildMwServices = args.serviceA;
      return next.provide({ serviceB: "beta" });
    };

    const handler = async (args: any) => {
      capturedHandlerArgs = args;
      return new Response("ok");
    };

    const pipeline = createPipeline([mw1, mw2], handler);
    await pipeline(createDummyRequest(), {});

    expect(capturedChildMwServices).toBe("alpha");
    expect(capturedHandlerArgs.serviceA).toBe("alpha");
    expect(capturedHandlerArgs.serviceB).toBe("beta");
    expect(capturedHandlerArgs.state).toEqual({ user: "alice" });
  });

  it("throws if next.provide is called multiple times or mixed with next()", async () => {
    const faultyMw1: MiddlewareHandler = async (_args, next) => {
      await next.provide({ s: 1 });
      return await next.provide({ s: 2 });
    };

    const faultyMw2: MiddlewareHandler = async (_args, next) => {
      await next();
      return await next.provide({ s: 1 });
    };

    const pipeline1 = createPipeline([faultyMw1], async () => new Response("ok"));
    await expect(pipeline1(createDummyRequest(), {})).rejects.toThrow(
      "next() called multiple times",
    );

    const pipeline2 = createPipeline([faultyMw2], async () => new Response("ok"));
    await expect(pipeline2(createDummyRequest(), {})).rejects.toThrow(
      "next() called multiple times",
    );
  });

  describe("input validation failures", () => {
    const rejectingParams = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "bad id", path: ["id"] }] }),
      },
    } as any;

    function createHonoContextStub() {
      const json = vi.fn((body: unknown, status: number) => Response.json(body, { status }));
      return { context: { json } as unknown as Context, json };
    }

    it("returns the 422 response without throwing when no middleware can observe the error", async () => {
      const { context, json } = createHonoContextStub();
      const handler = vi.fn(async () => new Response("ok"));
      const pipeline = createPipeline([], handler, { params: rejectingParams });

      const res = await pipeline(createDummyRequest(), { context });

      expect(res.status).toBe(422);
      expect(json).toHaveBeenCalledWith({ errors: [{ message: "bad id", path: ["id"] }] }, 422);
      expect(handler).not.toHaveBeenCalled();
    });

    it("throws ValidationError when there is no Hono context to answer with", () => {
      const pipeline = createPipeline([], async () => new Response("ok"), {
        params: rejectingParams,
      });

      expect(() => pipeline(createDummyRequest(), {})).toThrow(ValidationError);
    });

    it("still throws ValidationError to middleware", async () => {
      const { context } = createHonoContextStub();
      let caught: unknown;
      const observing: MiddlewareHandler = async (_args, next) => {
        try {
          return await next();
        } catch (error) {
          caught = error;
          return new Response("handled", { status: 400 });
        }
      };
      const pipeline = createPipeline([observing], async () => new Response("ok"), {
        params: rejectingParams,
      });

      const res = await pipeline(createDummyRequest(), { context });

      expect(res.status).toBe(400);
      expect(caught).toBeInstanceOf(ValidationError);
    });
  });

  describe("error and promise contract through middleware", () => {
    const syncThrowingHandler = (() => {
      throw new Error("sync handler failure");
    }) as unknown as () => Response;

    const rejectingParams = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "bad", path: [] }] }),
      },
    } as any;

    const layouts: [string, number][] = [
      ["single middleware", 1],
      ["multiple middleware", 2],
    ];

    function buildChain(count: number, middleware: MiddlewareHandler): MiddlewareHandler[] {
      const passThrough: MiddlewareHandler = (_args, next) => next();
      return [middleware, ...Array.from({ length: count - 1 }, () => passThrough)];
    }

    it.each(layouts)(
      "next() returns a Promise for a synchronous handler (%s)",
      async (_name, count) => {
        let returned: unknown;
        const probing: MiddlewareHandler = async (_args, next) => {
          const result = next();
          returned = result;
          return await result;
        };
        const pipeline = createPipeline(buildChain(count, probing), () => new Response("ok"));

        await pipeline(createDummyRequest(), {});

        expect(returned).toBeInstanceOf(Promise);
      },
    );

    it.each(layouts)("a synchronous handler throw rejects next() (%s)", async (_name, count) => {
      let outcome: unknown;
      const catching: MiddlewareHandler = (_args, next) =>
        next().catch((error: unknown) => {
          outcome = error;
          return new Response("recovered", { status: 500 });
        });
      const pipeline = createPipeline(buildChain(count, catching), syncThrowingHandler);

      const res = await pipeline(createDummyRequest(), {});

      expect(res.status).toBe(500);
      expect((outcome as Error).message).toBe("sync handler failure");
    });

    it.each(layouts)(
      "a synchronous handler throw rejects next.provide() (%s)",
      async (_name, count) => {
        let outcome: unknown;
        const catching: MiddlewareHandler = (_args, next) =>
          next.provide({ svc: 1 }).catch((error: unknown) => {
            outcome = error;
            return new Response("recovered", { status: 500 });
          });
        const pipeline = createPipeline(buildChain(count, catching), syncThrowingHandler);

        await pipeline(createDummyRequest(), {});

        expect((outcome as Error).message).toBe("sync handler failure");
      },
    );

    it.each(layouts)(
      "calling next() twice rejects instead of throwing (%s)",
      async (_name, count) => {
        let secondCall: unknown;
        const doubleCalling: MiddlewareHandler = async (_args, next) => {
          await next();
          secondCall = next();
          return await (secondCall as Promise<Response>).catch(() => new Response("second failed"));
        };
        const pipeline = createPipeline(buildChain(count, doubleCalling), () => new Response("ok"));

        const res = await pipeline(createDummyRequest(), {});

        expect(secondCall).toBeInstanceOf(Promise);
        expect(await res.text()).toBe("second failed");
      },
    );

    it("rejects when a synchronous middleware returns a non-Response", async () => {
      const bad = (() => "nope") as unknown as MiddlewareHandler;
      const pipeline = createPipeline([bad], () => new Response("ok"));

      await expect(
        Promise.resolve().then(() => pipeline(createDummyRequest(), {})),
      ).rejects.toThrow("Middleware at index 0 must return a Response");
    });

    it("accepts a synchronous middleware that returns a Response", async () => {
      const sync: MiddlewareHandler = () => new Response("from middleware");
      const pipeline = createPipeline([sync, sync], () => new Response("ok"));

      expect(await (await pipeline(createDummyRequest(), {})).text()).toBe("from middleware");
    });

    it("reports the index of the offending middleware", async () => {
      const good: MiddlewareHandler = (_args, next) => next();
      const bad = (async () => "nope") as unknown as MiddlewareHandler;
      const pipeline = createPipeline([good, bad], () => new Response("ok"));

      await expect(pipeline(createDummyRequest(), {})).rejects.toThrow(
        "Middleware at index 1 must return a Response",
      );
    });

    it("surfaces terminal validation failures as a rejection of next()", async () => {
      let outcome: unknown;
      const catching: MiddlewareHandler = (_args, next) =>
        next().catch((error: unknown) => {
          outcome = error;
          return new Response("recovered", { status: 400 });
        });
      const pipeline = createPipeline(
        [catching, (_args, next) => next()],
        () => new Response("ok"),
        { params: rejectingParams },
      );

      await pipeline(createDummyRequest(), {});

      expect(outcome).toBeInstanceOf(ValidationError);
    });

    it("exposes merged state and services on ctx while the handler runs", async () => {
      const ctx: Record<string, unknown> = {};
      let seen: { state: unknown; services: unknown } | undefined;
      const first: MiddlewareHandler = (_args, next) => next.provide({ a: 1 }, { s: 1 });
      const second: MiddlewareHandler = (_args, next) => next.provide({ b: 2 }, { t: 2 });
      const pipeline = createPipeline([first, second], () => {
        seen = { state: ctx.state, services: ctx.services };
        return new Response("ok");
      });

      await pipeline(createDummyRequest(), ctx);

      expect(seen).toEqual({ state: { s: 1, t: 2 }, services: { a: 1, b: 2 } });
    });
  });
});
