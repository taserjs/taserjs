import { describe, expect, it } from "vitest";
import { routeScaffoldSource, layoutScaffoldSource } from "@taserjs/router-generator";
import { indexRouteTemplate, rootLayoutTemplate } from "../src/templates/base.js";

/**
 * create-taserjs starter templates and the generator's
 * scaffolder intentionally produce the same fluent-API route/layout shape.
 * These anchors fail when one side evolves without the other.
 */
describe("template shape parity with generator scaffold", () => {
  const generatorRoute = routeScaffoldSource("/", "GET");
  const generatorLayout = layoutScaffoldSource("/$");

  it("route templates share the fluent builder shape", () => {
    expect(generatorRoute).toMatch(/export default t\.get\('\/'\)\.handler\(/);
    expect(indexRouteTemplate()).toMatch(/export default t\.get\('\/'\)\.handler\(/);
  });

  it("route templates import t directly from @taserjs/router and json from @taserjs/router/reply", () => {
    expect(generatorRoute).toContain("import { t } from '@taserjs/router'");
    expect(generatorRoute).toContain("import { json } from '@taserjs/router/reply'");
    expect(indexRouteTemplate()).toContain("import { t } from '@taserjs/router'");
    expect(indexRouteTemplate()).toContain("import { json } from '@taserjs/router/reply'");
  });

  it("layout templates share the layout mount shape", () => {
    expect(generatorLayout).toMatch(/t\.layout\('\/\$'\)/);
    expect(generatorLayout).toContain(".use(");
    expect(rootLayoutTemplate()).toMatch(/t\.layout\('\/\$'\)/);
    expect(rootLayoutTemplate()).toContain(".use(");
  });
});
