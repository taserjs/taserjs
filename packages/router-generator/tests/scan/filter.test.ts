import {
  compileRouteFileIgnorePattern,
  shouldIgnoreRouteFile,
  shouldIgnoreRoutePath,
} from "../../src/scan/filter.js";
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

describe("shouldIgnoreRoutePath", () => {
  it("ignores files starting with ignorePrefix '-'", () => {
    expect(shouldIgnoreRoutePath("-filename.ts", testGeneratorConfig)).toBe(true);
    expect(shouldIgnoreRoutePath("valid.get.ts", testGeneratorConfig)).toBe(false);
  });

  it("ignores files in folders starting with ignorePrefix '-'", () => {
    expect(shouldIgnoreRoutePath("-folder/filename.ts", testGeneratorConfig)).toBe(true);
    expect(shouldIgnoreRoutePath("nested/-folder/filename.ts", testGeneratorConfig)).toBe(true);
    expect(shouldIgnoreRoutePath("admin/-components/button.ts", testGeneratorConfig)).toBe(true);
    expect(shouldIgnoreRoutePath("valid/nested/route.get.ts", testGeneratorConfig)).toBe(false);
  });

  it("ignores dotfiles and dotfolders", () => {
    expect(shouldIgnoreRoutePath(".hidden.ts", testGeneratorConfig)).toBe(true);
    expect(shouldIgnoreRoutePath(".git/config", testGeneratorConfig)).toBe(true);
  });
});
