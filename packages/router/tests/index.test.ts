import { describe, it, expect } from "vitest";

import { t, layout, middleware, hono, createContext, defineTaser } from "../src/index.js";

describe("@taserjs/router", () => {
  it("exports routing primitives", () => {
    expect(typeof t).toBe("object");
    expect(typeof layout).toBe("function");
    expect(typeof middleware).toBe("function");
    expect(typeof hono).toBe("function");
    expect(typeof createContext).toBe("function");
    expect(typeof defineTaser).toBe("function");
  });
});
