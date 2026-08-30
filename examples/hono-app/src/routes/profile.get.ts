import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import z from "zod";

const mw = t.middleware()
  .query(z.object({ filter: z.string() }))
  .handler((ctx, next) => {
    if (ctx.query.filter === "yes") {
      return next({ type: "yes" as const })
    }
    return next({ type: "no" as const });
  })
  // .invariant()
  // .handler((ctx, next) => next({ insideId: ctx.query.filter }))

export default t.get("/profile").use(mw).handler((ctx) => {
  return json({ ok: "profile", state: ctx.state });
});
