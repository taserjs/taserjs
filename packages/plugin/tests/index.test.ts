import { describe, it, expect } from "vitest";
import { taserPlugin, taser } from "../src/index.js";

describe("@taserjs/plugin", () => {
  it("exports plugin and taser", () => {
    expect(typeof taserPlugin).toBe("object");
    expect(typeof taser).toBe("function");
  });
});
