import "./register.js";
import { describe, it, expectTypeOf, expect } from "vitest";
import { z } from "zod";
import { middleware, t } from "../src/index.js";
import { json } from "../src/reply.js";

const customMw = middleware((_ctx, next) => next({ traceId: "t-123" }));

describe("50 routes x 3-deep layout benchmark", () => {
  it("compiles 50 deep fluent routes", () => {
    const routes = [
      t
        .post("/r01")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler((ctx) => {
          expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
          expectTypeOf(ctx.state.traceId).toEqualTypeOf<string>();
          return json({ success: true });
        }),
      t
        .post("/r02")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r03")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r04")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r05")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r06")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r07")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r08")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r09")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r10")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r11")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r12")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r13")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r14")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r15")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r16")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r17")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r18")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r19")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r20")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r21")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r22")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r23")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r24")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r25")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r26")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r27")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r28")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r29")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r30")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r31")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r32")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r33")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r34")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r35")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r36")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r37")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r38")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r39")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r40")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r41")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r42")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r43")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r44")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r45")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r46")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r47")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r48")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r49")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
      t
        .post("/r50")
        .use(customMw)
        .query(z.object({ q: z.string() }))
        .body(z.object({ data: z.string() }))
        .returns({ 200: z.object({ success: z.boolean() }) })
        .handler(() => json({ success: true })),
    ];

    expect(routes).toHaveLength(50);
    expect(routes[0]?.path).toBe("/r01");
    expect(routes[49]?.path).toBe("/r50");
  });
});
