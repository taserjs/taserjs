import { describe, expect, it } from "vitest";

import { toUniversalMountPattern } from "../../src/support/mount-pattern.js";
import { InvalidMountPatternError, resolveMountBase } from "@taserjs/router-utils";

describe("toUniversalMountPattern", () => {
  it("normalizes Express named splat patterns", () => {
    expect(toUniversalMountPattern("/*splat")).toBe("/*");
    expect(toUniversalMountPattern("/api/*splat")).toBe("/api/*");
  });

  it("normalizes Express 5 brace wildcard patterns", () => {
    expect(toUniversalMountPattern("/{*splat}")).toBe("/*");
    expect(toUniversalMountPattern("/api/{*splat}")).toBe("/api/*");
  });

  it("normalizes Express optional-group splat patterns", () => {
    expect(toUniversalMountPattern("/foo{/*splat}")).toBe("/foo/*");
    expect(toUniversalMountPattern("/api{/*splat}")).toBe("/api/*");
    expect(() => resolveMountBase(toUniversalMountPattern("/foo{/*splat}"))).not.toThrow();
    expect(resolveMountBase(toUniversalMountPattern("/foo{/*splat}"))).toBe("/foo");
  });

  it("leaves universal patterns unchanged", () => {
    expect(toUniversalMountPattern("/*")).toBe("/*");
    expect(toUniversalMountPattern("/api/*")).toBe("/api/*");
  });

  it("passes exact paths through for utils rejection", () => {
    expect(toUniversalMountPattern("/")).toBe("/");
    expect(() => resolveMountBase(toUniversalMountPattern("/"))).toThrow(InvalidMountPatternError);
  });
});
