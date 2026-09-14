import { source } from "@/lib/source";
import { llms } from "fumadocs-core/source";

export const revalidate = false;

const LLM_SUMMARY_HEADER = `# Taser.js API Router Quick Reference

> Taser.js is a type-safe, file-based REST API router for TypeScript. Packages: \`@taserjs/router\`, \`@taserjs/cli\`, \`@taserjs/plugin\`, \`@taserjs/client\`. Runs on Vite standalone, Nitro, Next.js App Router, TanStack Start, and host pass-through (Express, Fastify, Hono).

## Canonical Architecture
- App definition: \`export default defineTaser({ ... })\` from \`@taserjs/router\` (uninstantiated \`TaserDefinition\`).
- Generated entry: \`src/.taserjs/routes.gen.ts\` exports runnable \`app\`, ambient types, and \`AppManifest\`.
- Paths: configure \`serverDir\` / \`routesDir\` / \`outputDir\` in \`taserjs.config.ts\` via \`@taserjs/cli\`.
- Mount URL prefix with \`defineTaser().basePath("/api")\` — never on plugin options.
- Next plugin options are only \`cwd?\` and \`config?\` (\`createTaser\` from \`@taserjs/plugin/next\`).

## Core File Naming Conventions
- Root Route: \`src/routes/index.get.ts\` -> GET /
- Dynamic Param: \`src/routes/users/$id.get.ts\` -> GET /users/:id
- Nested Flat Route: \`src/routes/users.$id.posts.get.ts\` -> GET /users/:id/posts
- Catch-All Splat: \`src/routes/files.$.get.ts\` -> GET /files/* (\`req.params._splat\`)
- Pathless Layout: \`src/routes/_auth.ts\` -> Scoped middleware for pathless group
- Directory Layout: \`src/routes/api/$.ts\` -> Scoped middleware for /api/*

## Route Handler Pattern
\`\`\`ts
import { json, notFound } from "@taserjs/router/reply";
import { t } from "@taserjs/router";
import { z } from "zod";

const GET = t
  .get("/users/:id")
  .params(z.object({ id: z.string().uuid() }))
  .query(z.object({ limit: z.coerce.number().default(10) }))
  .returns({
    200: z.object({ id: z.string(), name: z.string() }),
    404: z.object({ message: z.string() }),
  });

export default GET.handler(async ({ req, ctx }) => {
  const user = await ctx.db.findUser(req.params.id);
  if (!user) {
    return notFound({ message: "User not found" });
  }
  return json(user);
});
\`\`\`

## Middleware & Layout Pattern
Handler/middleware args are facet-split: \`{ req, ctx, state, ...services }\`.
\`\`\`ts
import { unauthorized } from "@taserjs/router/reply";
import { t } from "@taserjs/router";

export default t.layout("/dashboard").use(async ({ req }, next) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return unauthorized({ message: "Missing authorization" });
  }
  return next({ user: { id: "user_123", role: "admin" } });
});
\`\`\`

## Cookies
Mount \`cookie()\` from \`@taserjs/router/middleware/cookie\` on a layout, then use \`{ cookies }\` (Cookie Jar Instance).

## Streams
From \`@taserjs/router/stream\`: \`pipe\`, \`buffer\`, \`blob\`, \`sse\`. There is no \`file()\` helper.

## Typed Client
\`\`\`ts
import { createClient } from "@taserjs/client";
import type { AppManifest } from "./.taserjs/routes.gen.js";

const api = createClient<AppManifest>({ baseUrl: "/api" });
await api.users._id.$get({ param: { id: "..." } });
\`\`\`

## Reply Helpers
From \`@taserjs/router/reply\`:
- \`json\`, \`text\`, \`html\`, \`noContent\`, \`redirect\`
- \`badRequest\`, \`unauthorized\`, \`forbidden\`, \`notFound\`, \`unprocessableEntity\`, \`internalServerError\`, etc.

## Generate
- Dev/build: \`@taserjs/plugin\` regenerates \`routes.gen.ts\`
- Standalone: \`taser generate\` / \`npx @taserjs/cli generate\`

---

# Documentation Index
`;

export function GET() {
  const fumadocsIndex = llms(source).index();
  return new Response(`${LLM_SUMMARY_HEADER}\n${fumadocsIndex}`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
