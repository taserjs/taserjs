import { describe, it, expect } from "vitest";
import { t, layout, RouteBuilder, RouteValidationBuilder } from "../src/index.js";

describe("@taserjs/router", () => {
  it("exports routing primitives", () => {
    expect(typeof t).toBe("object");
    expect(typeof layout).toBe("function");
    expect(typeof RouteBuilder).toBe("function");
    expect(typeof RouteValidationBuilder).toBe("function");
  });
});
