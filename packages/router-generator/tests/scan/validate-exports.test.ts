import { describe, expect, it } from "vitest";

import {
  analyzeLayoutFileSource,
  analyzeRouteFileSource,
} from "../../src/scan/parse-route-source.js";

describe("parse-route-source", () => {
  it("accepts valid route and layout exports", () => {
    const routeSource = `import { t } from '#src/taser.js'
export const Route = t.get('/hello').handler(() => {})
`;
    const layoutSource = `import { t } from '#src/taser.js'
export const Middleware = t.middleware('account').handler(() => {})
`;

    expect(analyzeRouteFileSource(routeSource, "hello.get.ts", "GET").errors).toEqual([]);
    expect(analyzeLayoutFileSource(layoutSource, "account.ts").errors).toEqual([]);
  });

  it("requires t.get factory for GET routes", () => {
    const source = `export const Route = null
`;
    const errors = analyzeRouteFileSource(source, "bad.get.ts", "GET").errors;
    expect(errors.some((error) => error.message.includes("t.get"))).toBe(true);
  });

  it("parses t.any methods from AST", () => {
    const source = `import { t } from '#src/taser.js'
export const Route = t.any('/order', ['GET', 'OPTIONS']).handler(() => {})
`;
    const result = analyzeRouteFileSource(source, "order.any.ts", "ANY");
    expect(result.errors).toEqual([]);
    expect(result.anyMethods).toEqual(["GET", "OPTIONS"]);
  });

  it("accepts split route configuration", () => {
    const source = `import { t } from '#src/taser.js'
import { json } from '@taserjs/router/reply'
import { z } from 'zod'

const route = t.delete('/todo/:id')
  .returns({
    200: z.object({
      id: z.string(),
      userId: z.string(),
    }),
  })

export type RouteContext = typeof route.$Infer.Context

function doWork(ctx: RouteContext) {
  return Promise.resolve(ctx.params.id)
}

export const Route = route.handler(async (ctx) => {
  const id = await doWork(ctx)
  return json({ id, userId: ctx.state.userId })
})
`;
    expect(analyzeRouteFileSource(source, "$id.delete.ts", "DELETE").errors).toEqual([]);
  });

  it("accepts split layout configuration", () => {
    const source = `import { t } from '#src/taser.js'

const middleware = t.middleware('todo')

export const Middleware = middleware.handler(() => {})
`;
    expect(analyzeLayoutFileSource(source, "todo.ts").errors).toEqual([]);
  });

  it("rejects legacy createAnyRoute", () => {
    const source = `import { createAnyRoute } from '@taserjs/router'
export const Route = createAnyRoute('/order', ['GET']).handler(() => {})
`;
    const errors = analyzeRouteFileSource(source, "order.any.ts", "ANY").errors;
    expect(errors.some((error) => error.message.includes("t.any"))).toBe(true);
  });
});
