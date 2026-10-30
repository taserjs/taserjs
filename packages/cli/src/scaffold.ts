export function routeStub(method: string, canonicalPath: string): string {
  const verb = method.toLowerCase();
  const path = JSON.stringify(canonicalPath);
  const call = verb === "any" ? `t.any(${path}, ["GET", "POST"])` : `t.${verb}(${path})`;

  return `import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default ${call}.handler(async () => {
  return json({ message: ${JSON.stringify(`Hello from ${canonicalPath}`)} });
});
`;
}

export function layoutStub(layoutId: string): string {
  return `import { t } from "@taserjs/router";

export default t.layout(${JSON.stringify(layoutId)}).use(async ({ req, ctx, state }, next) => {
  return await next();
});
`;
}

export const APP_STUB = `import { defineTaser } from "@taserjs/router";

export default defineTaser();
`;

/** Route stub demonstrating zod validation for params, query and body, plus response schemas. */
export function routeWithValidatorsStub(method: string, canonicalPath: string): string {
  const verb = method.toLowerCase();
  const path = JSON.stringify(canonicalPath);
  const bodyChain = verb === "get" ? "" : `\n  .body(z.object({ name: z.string() }))`;
  const bodyUse = verb === "get" ? "" : `\n    body: req.body,`;

  return `import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import z from "zod";

export default t
  .${verb}(${path})${bodyChain}
  .params(z.object({ id: z.string().min(1) }))
  .query(z.object({ expand: z.array(z.string()).optional() }))
  .returns({
    200: z.object({ id: z.string(), query: z.record(z.string()).optional()${verb === "get" ? "" : ", body: z.unknown()"} }),
  })
  .handler(async ({ req }) => {
    return json({
      id: req.params.id,
      query: req.query,${bodyUse}
    });
  });
`;
}

/** Custom middleware file that adds `state` and `services` visible to consumers via inference. */
export function middlewareContentStub(name: string): string {
  return `import { middleware } from "@taserjs/router";

/**
 * Custom middleware. Use via \`t.get("/x").use(${name}).handler(...)\`.
 * \`next({ ... })\` adds state, \`next.provide(services)\` adds services;
 * both are inferred on route handlers automatically.
 */
export const ${name} = middleware().handler(async ({ req, state }, next) => {
  const start = Date.now();
  console.log(\`\${req.method} \${req.url}\`);
  const res = await next({ ${name}At: start });
  return res;
});
`;
}

/** Layout stub that runs a middleware for every route beneath it (nested layouts inherit it). */
export function layoutMiddlewareStub(layoutId: string): string {
  return `import { t } from "@taserjs/router";

export default t
  .layout(${JSON.stringify(layoutId)})
  .use(async ({ req }, next) => {
    // Runs for every matching route; nested layouts run their middlewares after this one.
    const start = Date.now();
    const res = await next({ startedAt: start });
    console.log(\`\${req.method} \${req.url}\` + " in " + (Date.now() - start) + "ms");
    return res;
  });
`;
}

/** Intermediate helper stub imported by {@link routeWithMiddlewareStub}. */
export const MIDDLEWARE_LOGGER_FILE = "middlewares/logger.ts";

export function routeWithMiddlewareStub(method: string, canonicalPath: string): string {
  const verb = method.toLowerCase();
  const path = JSON.stringify(canonicalPath);

  return `import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

import { logger } from "../middlewares/logger";

export default t
  .${verb}(${path})
  .use(logger)
  .handler(async ({ req, state }) => {
    return json({ ok: true, state });
  });
`;
}

