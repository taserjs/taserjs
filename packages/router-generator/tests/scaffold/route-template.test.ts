import { describe, expect, it } from "vitest";

import { layoutScaffoldSource, routeScaffoldSource } from "../../src/index.js";

describe("route scaffold templates", () => {
  it("emits split GET route stub", () => {
    const source = routeScaffoldSource("/posts", "GET");

    expect(source).toContain("import { json } from '@taserjs/router/reply'");
    expect(source).toContain("import { t } from '#taserjs/router'");
    expect(source).toContain("const GET = t.get('/posts')");
    expect(source).toContain("export type RouteContext = typeof GET.$Infer.Context");
    expect(source).toContain("export const Route = GET.handler(");
    expect(source).toContain("return json({ ok: true })");
    expect(source).not.toContain("export const Route = t.get");
  });

  it("emits split POST route stub", () => {
    const source = routeScaffoldSource("/todo", "POST");

    expect(source).toContain("const POST = t.post('/todo')");
    expect(source).toContain("export type RouteContext = typeof POST.$Infer.Context");
    expect(source).toContain("export const Route = POST.handler(");
  });

  it("emits t.middleware layout stub", () => {
    const source = layoutScaffoldSource("settings");

    expect(source).toContain("import { t } from '#taserjs/router'");
    expect(source).toContain("t.middleware('settings').use((_ctx, next) => next())");
    expect(source).toContain("export const Middleware =");
  });
});
