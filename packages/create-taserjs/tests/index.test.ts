import { describe, it, expect } from "vitest";
import { run } from "../src/index.js";

describe("create-taserjs", () => {
  it("exports run function", () => {
    expect(typeof run).toBe("function");
  });
});
