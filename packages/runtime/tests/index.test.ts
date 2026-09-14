import { describe, it, expect } from "vitest";
import { createTaserApp } from "../src/index.js";

describe("@taserjs/runtime", () => {
  it("exports createTaserApp", () => {
    expect(typeof createTaserApp).toBe("function");
  });
});
