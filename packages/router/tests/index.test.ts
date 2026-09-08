import { describe, it, expect } from "vitest";
import { VERSION } from "../src/index.js";

describe("@taserjs/router", () => {
  it("exports VERSION", () => {
    expect(VERSION).toBe("0.0.1");
  });
});
