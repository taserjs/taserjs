import "./register.js";
import { describe, expectTypeOf, it } from "vitest";

import { createTaserApp } from "../src/index.js";
import { json, type ReplyOf } from "../src/reply.js";

describe("route $Infer.Output", () => {
  const t = createTaserApp().context({});

  it("preserves ReplyOf from handler return", () => {
    const route = t.get("/hello").handler(() => json({ id: "1" }));

    type Output = (typeof route)["$Infer"]["Output"];
    expectTypeOf<Output>().toEqualTypeOf<ReplyOf<200, { id: string }>>();
  });

  it("unions success replies from handler branches", () => {
    const route = t.get("/hello").handler((ctx) => {
      if (!ctx.query) {
        return json({ created: true as const }, { status: 201 as const });
      }
      return json({ ok: true as const });
    });

    type Output = (typeof route)["$Infer"]["Output"];
    type Expected = ReplyOf<200, { ok: true }> | ReplyOf<201, { created: true }>;
    expectTypeOf<Output>().toEqualTypeOf<Expected>();
  });
});
