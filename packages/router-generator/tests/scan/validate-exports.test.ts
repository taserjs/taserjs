import { describe, expect, it } from "vitest";

import { analyzeLayoutFileSource, analyzeRouteFileSource } from "../../src/index.js";

describe("parse-route-source", () => {
  it("accepts valid route and layout exports", () => {
    const routeSource = `import { t } from '@taserjs/router'
export default t.get('/hello').handler(() => {})
`;
    const layoutSource = `import { t } from '@taserjs/router'
export default t.layout('account').use((_ctx, next) => next())
`;

    expect(analyzeRouteFileSource(routeSource, "hello.get.ts", "GET").errors).toEqual([]);
    expect(analyzeLayoutFileSource(layoutSource, "account.ts").errors).toEqual([]);
  });

  it("requires t.get factory for GET routes", () => {
    const source = `export default null
`;
    const errors = analyzeRouteFileSource(source, "bad.get.ts", "GET").errors;
    expect(errors.some((error) => error.message.includes("t.get"))).toBe(true);
  });

  it("parses t.any methods from AST", () => {
    const source = `import { t } from '@taserjs/router'
export default t.any('/order', ['GET', 'OPTIONS']).handler(() => {})
`;
    const result = analyzeRouteFileSource(source, "order.any.ts", "ANY");
    expect(result.errors).toEqual([]);
    expect(result.methods).toEqual(["GET", "OPTIONS"]);
  });

  it("accepts split route configuration", () => {
    const source = `import { t } from '@taserjs/router'
import { json } from '@taserjs/router/reply'
import { z } from 'zod'

const route = t.delete('/todo/:id')
  .returns({
    200: z.object({
      id: z.string(),
      userId: z.string(),
    }),
  })

export default route.handler(async (ctx) => {
  return json({ id: ctx.params.id })
})
`;
    expect(analyzeRouteFileSource(source, "$id.delete.ts", "DELETE").errors).toEqual([]);
  });

  it("accepts split layout configuration", () => {
    const source = `import { t } from '@taserjs/router'

const layoutChain = t.layout('todo')

export default layoutChain.use((_ctx, next) => next())
`;
    expect(analyzeLayoutFileSource(source, "todo.ts").errors).toEqual([]);
  });

  it("rejects standalone builder functions without t prefix", () => {
    const routeSource = `import { get } from '@taserjs/router'
export default get('/hello').handler(() => {})
`;
    const layoutSource = `import { layout } from '@taserjs/router'
export default layout('account').use((_ctx, next) => next())
`;

    expect(
      analyzeRouteFileSource(routeSource, "hello.get.ts", "GET").errors.length,
    ).toBeGreaterThan(0);
    expect(analyzeLayoutFileSource(layoutSource, "account.ts").errors.length).toBeGreaterThan(0);
  });
});
