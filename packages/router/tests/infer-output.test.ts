import "./register.js";
import { describe, expectTypeOf, it } from "vitest";

import { createTaserApp, reply, type ReplyOf } from "../src/index.js";

describe("route $Infer.Output", () => {
  const t = createTaserApp().context({});

  it("preserves ReplyOf from handler return", () => {
    const route = t.get("/hello").handler(() => reply.json({ id: "1" }));

    type Output = (typeof route)["$Infer"]["Output"];
    expectTypeOf<Output>().toEqualTypeOf<ReplyOf<200, { id: string }>>();
  });

  it("unions success replies from handler branches", () => {
    const route = t.get("/hello").handler((ctx) => {
      if (!ctx.query) {
        return reply.json({ created: true as const }, { status: 201 as const });
      }
      return reply.json({ ok: true as const });
    });

    type Output = (typeof route)["$Infer"]["Output"];
    type Expected = ReplyOf<200, { ok: true }> | ReplyOf<201, { created: true }>;
    expectTypeOf<Output>().toEqualTypeOf<Expected>();
  });
});
