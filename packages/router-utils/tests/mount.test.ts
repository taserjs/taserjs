import { describe, expect, it } from "vitest";

import { composeBasePath, normalizeScope } from "../src/mount/index.js";

describe("normalizeScope", () => {
  it("returns undefined for empty or root scope", () => {
    expect(normalizeScope(undefined)).toBeUndefined();
    expect(normalizeScope("/")).toBeUndefined();
  });

  it("normalizes trailing slashes and missing leading slash", () => {
    expect(normalizeScope("/api/")).toBe("/api");
    expect(normalizeScope("api")).toBe("/api");
  });
});

describe("composeBasePath", () => {
  it("joins nested base paths without duplication", () => {
    expect(composeBasePath("/api", "/api/v1")).toBe("/api/v1");
  });
});
