import { reply, type ReplyResult } from "@taserjs/router-utils";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { composePipeline, middlewareToLayer } from "../src/run-middleware.js";

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

  it("merges state via next({ state }) and continues", async () => {
    const run = composePipeline(
      [
        middlewareToLayer({
          state: z.object({ userId: z.string() }),
          handler: (_ctx, next) => next({ state: { userId: "u-1" } }),
        }),
      ],
      async (ctx) => reply.json({ userId: (ctx.state as { userId: string }).userId }),
    );

    const result = await run({ state: {} });
    expect(await result.json()).toEqual({ userId: "u-1" });
  });

  it("merges next({ ctx }) onto the top-level pipeline context", async () => {
    const run = composePipeline(
      [
        middlewareToLayer({
          handler: (_ctx, next) => next({ ctx: { adminDb: { name: "admin" } } }),
        }),
      ],
      async (ctx) => {
        const adminDb = (ctx as unknown as { adminDb: { name: string } }).adminDb;
        return reply.json({ name: adminDb.name });
      },
    );

    const result = await run({ state: {} });
    expect(await result.json()).toEqual({ name: "admin" });
  });

  it("merges next({ state, ctx }) together and skips reserved ctx keys", async () => {
    const run = composePipeline(
      [
        middlewareToLayer({
          handler: (_ctx, next) =>
            next({
              state: { userId: "u-1" },
              ctx: { flag: true, state: { hijacked: true }, query: "nope" },
            }),
        }),
      ],
      async (ctx) => {
        const flagged = ctx as unknown as { flag: boolean };
        return reply.json({
          userId: (ctx.state as { userId: string }).userId,
          flag: flagged.flag,
          stateHijack: (ctx.state as { hijacked?: boolean }).hijacked ?? null,
          query: ctx.query ?? null,
        });
      },
    );

    const result = await run({ state: {}, query: { keep: true } });
    expect(await result.json()).toEqual({
      userId: "u-1",
      flag: true,
      stateHijack: null,
      query: { keep: true },
    });
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
