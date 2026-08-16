import { describe, expect, it } from "vitest";

import { layoutScaffoldSource, routeScaffoldSource } from "../../src/scaffold/route-template.js";

describe("route scaffold templates", () => {
  it("emits split GET route stub", () => {
    const source = routeScaffoldSource("/posts", "GET", "#src/taser.js");

    expect(source).toContain("import { t } from '#src/taser.js'");
    expect(source).toContain("const GET = t.get('/posts')");
    expect(source).toContain("export type RouteContext = typeof GET.$Infer.Context");
    expect(source).toContain("export const Route = GET.handler(");
    expect(source).not.toContain("export const Route = t.get");
  });

  it("emits split POST route stub", () => {
    const source = routeScaffoldSource("/todo", "POST", "#src/taser.js");

    expect(source).toContain("const POST = t.post('/todo')");
    expect(source).toContain("export type RouteContext = typeof POST.$Infer.Context");
    expect(source).toContain("export const Route = POST.handler(");
  });

  it("emits t.middleware layout stub", () => {
    const source = layoutScaffoldSource("settings", "#src/taser.js");

    expect(source).toContain("import { t } from '#src/taser.js'");
    expect(source).toContain("t.middleware");
    expect(source).toContain("export const Middleware =");
    expect(source).toContain("handler:");
    expect(source).not.toMatch(/\bhandle\s*:/);
    expect(source).toContain("'settings'");
  });
});
