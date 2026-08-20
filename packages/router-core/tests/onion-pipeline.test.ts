import { reply, type ReplyResult } from "@taserjs/router-utils";
import { describe, expect, it } from "vitest";

import { composePipeline, middlewareToLayer } from "../src/index.js";

describe("onion composePipeline", () => {
  it("runs after-hooks on the way out", async () => {
    const order: string[] = [];
    const outer = middlewareToLayer({
      handler: async (_ctx, next) => {
        order.push("outer-before");
        const res = (await next()) as ReplyResult;
        order.push("outer-after");
        expect(res.status).toBe(200);
        return res;
      },
    });
    const inner = middlewareToLayer({
      handler: async (_ctx, next) => {
        order.push("inner-before");
        const res = (await next()) as ReplyResult;
        order.push("inner-after");
        return res;
      },
    });

    const run = composePipeline([outer, inner], async () => {
      order.push("handler");
      return reply.json({ ok: true });
    });

    const result = await run({ state: {} });
    expect(result.status).toBe(200);
    expect(order).toEqual([
      "outer-before",
      "inner-before",
      "handler",
      "inner-after",
      "outer-after",
    ]);
  });

  it("allows early return without calling next", async () => {
    const run = composePipeline(
      [
        middlewareToLayer({
          handler: () => reply.unauthorized({ error: "nope" }),
        }),
        middlewareToLayer({
          handler: async (_ctx, next) => next(),
        }),
      ],
      async () => reply.json({ ok: true }),
    );

    const result = await run({ state: {} });
    expect(result.status).toBe(401);
  });

  it("merges state via next(state) and continues", async () => {
    const run = composePipeline(
      [
        middlewareToLayer({
          handler: (_ctx, next) => next({ userId: "u-1" }),
        }),
      ],
      async (ctx) => reply.json({ userId: (ctx.state as { userId: string }).userId }),
    );

    const result = await run({ state: {} });
    expect(await result.json()).toEqual({ userId: "u-1" });
  });

  it("accumulates state across multiple sequential middlewares", async () => {
    const run = composePipeline(
      [
        middlewareToLayer({
          handler: (_ctx, next) => next({ a: 1 }),
        }),
        middlewareToLayer({
          handler: (_ctx, next) => next({ b: "two" }),
        }),
      ],
      async (ctx) => reply.json({ state: ctx.state }),
    );

    const result = await run({ state: {} });
    expect(await result.json()).toEqual({ state: { a: 1, b: "two" } });
  });

  it("lets outer middleware catch inner throws", async () => {
    const run = composePipeline(
      [
        middlewareToLayer({
          handler: async (_ctx, next) => {
            try {
              return await next();
            } catch {
              return reply.internalServerError({ message: "mapped" });
            }
          },
        }),
      ],
      async () => {
        throw new Error("boom");
      },
    );

    const result = await run({ state: {} });
    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ message: "mapped" });
  });
});
