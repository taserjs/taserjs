import { describe, it, expect } from "vitest";

import { defineConfig, loadConfig, executeGenerate } from "../src/index.js";

describe("@taserjs/cli", () => {
  it("exports CLI primitives", () => {
    expect(typeof defineConfig).toBe("function");
    expect(typeof loadConfig).toBe("function");
    expect(typeof executeGenerate).toBe("function");
  });
});
