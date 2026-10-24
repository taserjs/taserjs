import { describe, expect, it } from "vitest";

import {
  deriveCanonicalUrl,
  formatRelativeImport,
  isIgnoredPath,
  parseFilePath,
  splitUnescapedDots,
} from "../src/paths.js";

describe("paths", () => {
  it.each([
    ["posts.$id", ["posts", "$id"]],
    ["sitemap[.]xml", ["sitemap[.]xml"]],
    ["a..b", ["a", "b"]],
    ["a[.b", ["a[.b"]],
  ])("splitUnescapedDots(%j)", (stem, parts) => {
    expect(splitUnescapedDots(stem)).toEqual(parts);
  });

  it.each([
    ["users/$id.get.ts", { dir: "users", verb: "get", stem: "$id" }],
    ["Users.GET.tsx", { dir: "", verb: "get", stem: "Users" }],
    ["a/b/$.all.ts", { dir: "a/b", verb: "all", stem: "$" }],
    ["admin/$.ts", { dir: "admin", verb: null, stem: "$" }],
    ["sitemap[.]get.ts", { dir: "", verb: null, stem: "sitemap[.]get" }],
    ["win\\dir\\x.post.ts", { dir: "win/dir", verb: "post", stem: "x" }],
  ])("parseFilePath(%j)", (file, expected) => {
    expect(parseFilePath(file)).toEqual(expected);
  });

  it("ignores non-TypeScript files", () => {
    expect(parseFilePath("readme.md")).toBeNull();
    expect(parseFilePath("script.js")).toBeNull();
  });

  it.each([
    ["-types.ts", true],
    ["admin/-shared/utils.ts", true],
    ["admin\\-shared\\utils.ts", true],
    ["admin/users-list.get.ts", false],
  ])("isIgnoredPath(%j) is %s", (file, ignored) => {
    expect(isIgnoredPath(file)).toBe(ignored);
  });

  it("rejects [...slug] catch-all syntax", () => {
    expect(() => deriveCanonicalUrl("", "[...slug]")).toThrow(/"\[\.\.\.slug\]" is not supported/);
  });

  it.each([
    ["/app/src/.taserjs", "/app/src/routes/a.get.ts", ".js", "../routes/a.get.js"],
    ["/app/src/.taserjs", "/app/src/taser.ts", "", "../taser"],
    ["/app/src/.taserjs", "/app/src/.taserjs/serve.ts", ".mjs", "./serve.mjs"],
    ["C:\\app\\src\\.taserjs", "C:\\app\\src\\routes\\$.tsx", ".js", "../routes/$.js"],
  ])("formatRelativeImport(%j, %j, %j)", (fromDir, target, ext, expected) => {
    expect(formatRelativeImport(fromDir, target, ext)).toBe(expected);
  });
});
