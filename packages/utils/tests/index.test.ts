import { describe, it, expect } from "vitest";

import { json, validateStandardSchema } from "../src/index.js";

describe("@taserjs/utils", () => {
  it("exports utility primitives", () => {
    expect(typeof json).toBe("function");
    expect(typeof validateStandardSchema).toBe("function");
  });
});
