import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildOptions } from "../src/options.js";

describe("buildOptions", () => {
  it("maps argv flags to generator options", () => {
    const options = buildOptions({
      quiet: true,
      routes: "./routes",
      ignorePrefix: "-",
      extension: "true",
      validate: true,
      config: "/app/taser.config.json",
    });

    expect(options.configFile).toBe(resolve("/app/taser.config.json"));
    expect(options.quiet).toBe(true);
    expect(options.routes).toContain("routes");
    expect(options.ignorePrefix).toBe("-");
    expect(options.extension).toBe(true);
    expect(options.validate).toBe(true);
  });

  it("maps force flag to generator options", () => {
    expect(buildOptions({ force: true }).force).toBe(true);
    expect(buildOptions({ force: false }).force).toBeUndefined();
  });

  it("parses extension boolean strings", () => {
    expect(buildOptions({ extension: "true" }).extension).toBe(true);
    expect(buildOptions({ extension: "false" }).extension).toBe(false);
    expect(buildOptions({ extension: ".js" }).extension).toBe(".js");
  });
});
