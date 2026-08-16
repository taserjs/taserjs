import { compileRouteFileIgnorePattern, shouldIgnoreRouteFile } from "../../src/scan/filter.js";
import { testGeneratorConfig } from "../helpers/test-config.js";

describe("compileRouteFileIgnorePattern", () => {
  it("anchors patterns to full filename match", () => {
    const pattern = compileRouteFileIgnorePattern("test");
    expect(pattern.test("test")).toBe(true);
    expect(pattern.test("my-test")).toBe(false);
    expect(pattern.test("test-file")).toBe(false);
  });

  it("rejects overly long patterns", () => {
    expect(() => compileRouteFileIgnorePattern("a".repeat(201))).toThrow("exceeds maximum length");
  });

  it("rejects invalid regular expressions", () => {
    expect(() => compileRouteFileIgnorePattern("(")).toThrow(
      "Invalid ignorePattern regular expression",
    );
  });
});

describe("shouldIgnoreRouteFile with pattern", () => {
  it("ignores files matching anchored pattern", () => {
    const config = {
      ...testGeneratorConfig,
      ignorePattern: "private.*",
    };
    expect(shouldIgnoreRouteFile("private.get.ts", config)).toBe(true);
    expect(shouldIgnoreRouteFile("public.get.ts", config)).toBe(false);
  });
});
