import { describe, it, expect } from "vitest";
import { VERSION } from "../src/index.js";

describe("create-taserjs", () => {
  it("exports VERSION", () => {
    expect(VERSION).toBe("0.0.1");
  });
});
