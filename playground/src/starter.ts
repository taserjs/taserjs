import { routeStub } from "@taserjs/cli/codegen";

/**
 * The default starter project, mirroring examples/start-app: a root layout with a
 * middleware, two routes, and a typed app context. Handlers reference generated
 * manifest types (RoutePath, AppContext) so cross-file hover works on first load.
 */
export function starterProject(): Record<string, string> {
  return {
    "/taser.ts": `import { createContext, defineTaser } from "@taserjs/router";

const context = createContext({
  request: () => ({ requestId: crypto.randomUUID() }),
});

export default defineTaser().context(context);
`,
    "/routes/index.get.ts": routeStub("GET", "/"),
    "/routes/users/$id.get.ts": `import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import z from "zod";

export default t
  .get("/users/:id")
  .params(z.object({ id: z.string().min(1) }))
  .query(z.object({ full: z.boolean().optional() }))
  .handler(async ({ req, ctx, state }) => {
    return json({
      id: req.params.id,
      full: req.query.full ?? false,
      requestId: ctx.requestId,
      tookMs: Date.now() - state.startedAt,
    });
  });
`,
    "/routes/$.ts": `import { t } from "@taserjs/router";

export default t.layout("/*").use(async (_args, next) => {
  // Root layout middleware: inherited by every route beneath it.
  const start = Date.now();
  return await next({ startedAt: start });
});
`,
  };
}

/** The file the editor opens on first load. */
export const DEFAULT_ACTIVE = "/routes/index.get.ts";
