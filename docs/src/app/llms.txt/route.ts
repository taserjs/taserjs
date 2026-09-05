import { source } from "@/lib/source";
import { llms } from "fumadocs-core/source";

export const revalidate = false;

const LLM_SUMMARY_HEADER = `# Taser.js API Router Quick Reference

> Taser.js is a type-safe, file-based REST API router for TypeScript supporting Vite Standalone, Nitro Multi-Cloud, Next.js App Router, and Host Pass-Through (Express, Fastify, Hono, Web Standard).

## Core File Naming Conventions
- Root Route: \`src/routes/index.get.ts\` -> GET /
- Dynamic Param: \`src/routes/users/$id.get.ts\` -> GET /users/:id
- Nested Flat Route: \`src/routes/users.$id.posts.get.ts\` -> GET /users/:id/posts
- Catch-All Splat: \`src/routes/files.$.get.ts\` -> GET /files/*
- Pathless Layout: \`src/routes/_auth.ts\` -> Scoped middleware applied to all sibling routes
- Directory Layout: \`src/routes/api/$.ts\` -> Scoped middleware applied to /api/*

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

export type RouteContext = typeof GET.$Infer.Context;

export default GET.handler(async (ctx) => {
  const user = await ctx.db.findUser(ctx.params.id);
  if (!user) {
    return notFound({ message: "User not found" });
  }
  return json(user);
});
\`\`\`

## Middleware & Layout Pattern
\`\`\`ts
import { unauthorized } from "@taserjs/router/reply";
import { t } from "@taserjs/router";

export default t.layout("/dashboard").use(async (ctx, next) => {
  const authHeader = ctx.headers.get("authorization");
  if (!authHeader) {
    return unauthorized({ message: "Missing authorization" });
  }
  return next({ user: { id: "user_123", role: "admin" } });
});
\`\`\`

## Standalone Middleware Unit
\`\`\`ts
import { middleware } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";
import { z } from "zod";

export const adminGuard = middleware()
  .query(z.object({ token: z.string() }))
  .handler(async (ctx, next) => {
    if (ctx.query.token !== "secret") return unauthorized();
    return next({ admin: true });
  });
\`\`\`

## Reply Helpers
All HTTP responses use standalone functions from \`@taserjs/router/reply\`:
- \`json(data, init?)\`, \`text(data, init?)\`, \`html(data, init?)\`, \`noContent(init?)\`, \`redirect(location, init?)\`
- \`ok()\`, \`created()\`, \`badRequest()\`, \`unauthorized()\`, \`forbidden()\`, \`notFound()\`, \`unprocessableEntity()\`, \`internalServerError()\`, etc.

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
