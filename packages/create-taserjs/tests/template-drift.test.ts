import { describe, expect, it } from "vitest";
import { routeScaffoldSource, layoutScaffoldSource } from "@taserjs/router-generator";
import { indexRouteTemplate, rootLayoutTemplate } from "../src/templates/base.js";

/**
 * Issue 06 / H10: create-taserjs starter templates and the generator's
 * scaffolder intentionally produce the same fluent-API route/middleware shape.
 * These anchors fail when one side evolves without the other.
 */
describe("template shape parity with generator scaffold", () => {
  const generatorRoute = routeScaffoldSource("/", "GET", "#src/taser.js");
  const generatorLayout = layoutScaffoldSource("/$", "#src/taser.js");

  it("route templates share the fluent builder shape", () => {
    expect(generatorRoute).toMatch(/const GET = t\.get\('/);
    expect(indexRouteTemplate()).toMatch(/const GET = t\.get\('/);
  });

  it("route templates export $Infer-derived context and a Route handler", () => {
    expect(generatorRoute).toContain("$Infer.Context");
    expect(generatorRoute).toMatch(/export const Route = GET\.handler\(/);
    expect(indexRouteTemplate()).toContain("$Infer.Context");
    expect(indexRouteTemplate()).toMatch(/export const Route = GET\.handler\(/);
  });

  it("layout templates share the middleware mount shape", () => {
    expect(generatorLayout).toMatch(/t\.middleware\('\/\$'\)/);
    expect(generatorLayout).toContain(".use(");
    expect(rootLayoutTemplate()).toMatch(/t\.middleware\('\/\$'\)/);
    expect(rootLayoutTemplate()).toContain(".use(");
  });
});
