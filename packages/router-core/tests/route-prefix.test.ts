import { describe, expect, it } from "vitest";

import { joinRoutePrefix, normalizeRoutePrefix } from "../src/runtime/route-prefix.js";

describe("route-prefix", () => {
  it("joins manifest paths with mount prefix", () => {
    expect(joinRoutePrefix("/", "/hello")).toBe("/hello");
    expect(joinRoutePrefix("/api", "/hello")).toBe("/api/hello");
    expect(joinRoutePrefix("/api", "/")).toBe("/api");
    expect(joinRoutePrefix("/api", "/files/*")).toBe("/api/files/*");
  });

  it("normalizes trailing slashes on prefix", () => {
    expect(normalizeRoutePrefix("/api/")).toBe("/api");
    expect(normalizeRoutePrefix("")).toBe("/");
  });
});
