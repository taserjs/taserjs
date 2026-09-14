import { describe, expect, expectTypeOf, it } from "vitest";
import { createContext, defineTaser, t, type TaserRequest } from "../src/index.js";

describe("defineTaser declarative builder", () => {
  it("creates a builder with default empty options", () => {
    const builder = defineTaser();
    expect(builder.options.basePath).toBeUndefined();
    expect(builder.options.context).toBeUndefined();
    expect(builder.options.notFound).toBeUndefined();
    expect(builder.options.onError).toBeUndefined();
    expect(builder._context).toBeUndefined();
  });

  it("configures basePath, notFound, and onError via fluent methods", () => {
    const notFoundHandler = ({ req }: { req: TaserRequest; ctx: Record<string, unknown> }) =>
      Response.json({ error: "not found", path: req.path }, { status: 404 });

    const onErrorHandler = (err: unknown, req: TaserRequest) =>
      Response.json({ error: (err as Error).message, path: req.path }, { status: 500 });

    const builder = defineTaser()
      .basePath("/api/v1")
      .notFound(notFoundHandler)
      .onError(onErrorHandler);

    expect(builder.options.basePath).toBe("/api/v1");
    expect(builder.options.notFound).toBe(notFoundHandler);
    expect(builder.options.onError).toBe(onErrorHandler);
  });

  it("configures context and infers phantom _context type", () => {
    const ctxDef = createContext({
      boot: async () => ({ db: "sqlite://memory" }),
      request: (req) => ({ requestId: req.headers.get("x-req-id") ?? "default" }),
    });

    const builder = defineTaser()
      .basePath("/api")
      .context(ctxDef)
      .notFound(({ req, ctx }) => {
        expectTypeOf(ctx).toMatchTypeOf<{ db: string; requestId: string }>();
        return Response.json({ notFound: true, path: req.path });
      });

    expect(builder.options.basePath).toBe("/api");
    expect(builder.options.context).toBe(ctxDef);

    // Validate static phantom typing
    type InferredContext = NonNullable<typeof builder._context>;
    expectTypeOf<InferredContext>().toMatchTypeOf<{ db: string; requestId: string }>();
  });

  it("allows explicit generic type on defineTaser<TContext>()", () => {
    interface CustomCtx {
      tenantId: string;
    }

    const builder = defineTaser<CustomCtx>();
    type InferredContext = NonNullable<typeof builder._context>;
    expectTypeOf<InferredContext>().toEqualTypeOf<CustomCtx>();
  });

  it("is also accessible via t.app()", () => {
    const builder = t.app().basePath("/v2");
    expect(builder.options.basePath).toBe("/v2");
  });
});
