import { source } from "@/lib/source";
import { llms } from "fumadocs-core/source";

export const revalidate = false;

const LLM_SUMMARY_HEADER = `# TaserJS API Router Quick Reference

> Taser is a type-safe, file-based REST API router for TypeScript supporting Vite Standalone, Nitro Multi-Cloud, Next.js App Router, and Host Pass-Through (Express, Fastify, Hono, Web Standard).

## Core File Naming Conventions
- Root Route: \`src/routes/index.get.ts\` -> GET /
- Dynamic Param: \`src/routes/users/$id.get.ts\` -> GET /users/:id
- Nested Flat Route: \`src/routes/users.$id.posts.get.ts\` -> GET /users/:id/posts
- Catch-All Splat: \`src/routes/files.$.get.ts\` -> GET /files/*
- Pathless Layout: \`src/routes/_auth.ts\` -> Scoped middleware applied to all sibling routes
- Directory Layout: \`src/routes/api/$.ts\` -> Scoped middleware applied to /api/*

## Handler API Pattern
\`\`\`ts
import { Route } from "#taserjs/router";
import { t } from "./_taser";
import { z } from "zod";

export default t
  .get()
  .query(z.object({ limit: z.coerce.number().default(10) }))
  .returns(200, z.object({ items: z.array(z.string()) }))
  .handler(async (ctx) => {
    return ctx.reply.json(200, { items: ["a", "b"] });
  });
\`\`\`

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
