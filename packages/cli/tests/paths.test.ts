import { describe, expect, it } from "vitest";
import {
  deriveCanonicalUrl,
  deriveLayoutInfo,
  isBreakoutSegment,
  isIgnoredPath,
  isPathlessSegment,
  normalizeSegmentToUrl,
  parseFilePath,
  splitUnescapedDots,
  unescapeBrackets,
} from "../src/paths.js";

describe("paths and URL normalization", () => {
  it("splits filename stem by unescaped dots while preserving bracketed content", () => {
    expect(splitUnescapedDots("users")).toEqual(["users"]);
    expect(splitUnescapedDots("posts.$id")).toEqual(["posts", "$id"]);
    expect(splitUnescapedDots("sitemap[.]xml")).toEqual(["sitemap[.]xml"]);
    expect(splitUnescapedDots("api.v1.users.$id")).toEqual(["api", "v1", "users", "$id"]);
    expect(splitUnescapedDots("[a.b.c].$id")).toEqual(["[a.b.c]", "$id"]);
  });

  it("unescapes brackets into literal characters", () => {
    expect(unescapeBrackets("sitemap[.]xml")).toBe("sitemap.xml");
    expect(unescapeBrackets("[_]private")).toBe("_private");
    expect(unescapeBrackets("[foo]")).toBe("foo");
  });

  it("throws diagnostic error if bracketed slug syntax [...slug] is used", () => {
    expect(() => unescapeBrackets("[...slug]")).toThrowError(/Catch-all splats strictly use "\$"/);
    expect(() => unescapeBrackets("[...all]")).toThrowError(/Catch-all splats strictly use "\$"/);
  });

  it("identifies pathless segments", () => {
    expect(isPathlessSegment("_auth")).toBe(true);
    expect(isPathlessSegment("_public")).toBe(true);
    expect(isPathlessSegment("[_]private")).toBe(false);
    expect(isPathlessSegment("users")).toBe(false);
  });

  it("identifies breakout segments while respecting bracket escaping", () => {
    expect(isBreakoutSegment("posts_")).toBe(true);
    expect(isBreakoutSegment("$id_")).toBe(true);
    expect(isBreakoutSegment("$_")).toBe(true);
    expect(isBreakoutSegment("index_")).toBe(true);
    expect(isBreakoutSegment("task[_]_")).toBe(true);
    expect(isBreakoutSegment("[_]_")).toBe(true);

    // Negative cases: bracket escaped underscores or non-breakout segments
    expect(isBreakoutSegment("task[_]")).toBe(false);
    expect(isBreakoutSegment("[_]")).toBe(false);
    expect(isBreakoutSegment("posts")).toBe(false);
    expect(isBreakoutSegment("$id")).toBe(false);
    expect(isBreakoutSegment("$")).toBe(false);
    expect(isBreakoutSegment("_auth")).toBe(false);
    expect(isBreakoutSegment("_")).toBe(false);
    expect(isBreakoutSegment("")).toBe(false);
  });

  it("normalizes segments to canonical URL tokens", () => {
    expect(normalizeSegmentToUrl("_auth")).toEqual({ urlSegment: null, isPathless: true });
    expect(normalizeSegmentToUrl("index")).toEqual({ urlSegment: null, isPathless: false });
    expect(normalizeSegmentToUrl("$")).toEqual({ urlSegment: "*", isPathless: false });
    expect(normalizeSegmentToUrl("$id")).toEqual({ urlSegment: ":id", isPathless: false });
    expect(normalizeSegmentToUrl("$userId")).toEqual({ urlSegment: ":userId", isPathless: false });
    expect(normalizeSegmentToUrl("sitemap[.]xml")).toEqual({
      urlSegment: "sitemap.xml",
      isPathless: false,
    });
    expect(normalizeSegmentToUrl("[_]private")).toEqual({
      urlSegment: "_private",
      isPathless: false,
    });
    expect(normalizeSegmentToUrl("users")).toEqual({ urlSegment: "users", isPathless: false });
  });

  it("normalizes breakout segments and strips trailing underscores", () => {
    expect(normalizeSegmentToUrl("posts_")).toEqual({ urlSegment: "posts", isPathless: false });
    expect(normalizeSegmentToUrl("$id_")).toEqual({ urlSegment: ":id", isPathless: false });
    expect(normalizeSegmentToUrl("$_")).toEqual({ urlSegment: "*", isPathless: false });
    expect(normalizeSegmentToUrl("index_")).toEqual({ urlSegment: null, isPathless: false });
    expect(normalizeSegmentToUrl("[index]_")).toEqual({ urlSegment: "index", isPathless: false });
    expect(normalizeSegmentToUrl("task[_]")).toEqual({ urlSegment: "task_", isPathless: false });
    expect(normalizeSegmentToUrl("task[_]_")).toEqual({ urlSegment: "task_", isPathless: false });
  });

  it("identifies ignored paths with dash prefix", () => {
    expect(isIgnoredPath("-types.ts")).toBe(true);
    expect(isIgnoredPath("-utils/helper.ts")).toBe(true);
    expect(isIgnoredPath("admin/-components/button.tsx")).toBe(true);
    expect(isIgnoredPath("admin/users.get.ts")).toBe(false);
  });

  it("parses file paths and detects verbs and layouts", () => {
    const route = parseFilePath("admin/users.get.ts", ["ts", "tsx"]);
    expect(route).toEqual({
      dir: "admin",
      name: "users.get",
      ext: "ts",
      verb: "get",
      stem: "users",
    });

    const routeTsx = parseFilePath("posts/$id.post.tsx", ["ts", "tsx"]);
    expect(routeTsx).toEqual({
      dir: "posts",
      name: "$id.post",
      ext: "tsx",
      verb: "post",
      stem: "$id",
    });

    const routeAll = parseFilePath("proxy/$.all.ts", ["ts", "tsx"]);
    expect(routeAll).toEqual({
      dir: "proxy",
      name: "$.all",
      ext: "ts",
      verb: "all",
      stem: "$",
    });

    const routeAny = parseFilePath("webhook.any.ts", ["ts", "tsx"]);
    expect(routeAny).toEqual({
      dir: "",
      name: "webhook.any",
      ext: "ts",
      verb: "any",
      stem: "webhook",
    });

    const routeQuery = parseFilePath("search.query.ts", ["ts", "tsx"]);
    expect(routeQuery).toEqual({
      dir: "",
      name: "search.query",
      ext: "ts",
      verb: "query",
      stem: "search",
    });

    const routeOptions = parseFilePath("cors.options.ts", ["ts", "tsx"]);
    expect(routeOptions).toEqual({
      dir: "",
      name: "cors.options",
      ext: "ts",
      verb: "options",
      stem: "cors",
    });

    const layout = parseFilePath("admin/$.ts", ["ts", "tsx"]);
    expect(layout).toEqual({
      dir: "admin",
      name: "$",
      ext: "ts",
      verb: null,
      stem: "$",
    });

    const siblingLayout = parseFilePath("admin.tsx", ["ts", "tsx"]);
    expect(siblingLayout).toEqual({
      dir: "",
      name: "admin",
      ext: "tsx",
      verb: null,
      stem: "admin",
    });

    const nonMatching = parseFilePath("notes.md", ["ts", "tsx"]);
    expect(nonMatching).toBeNull();
  });

  it("derives canonical URL for various file structures", () => {
    expect(deriveCanonicalUrl("", "index").canonicalPath).toBe("/");
    expect(deriveCanonicalUrl("", "users").canonicalPath).toBe("/users");
    expect(deriveCanonicalUrl("users", "$id").canonicalPath).toBe("/users/:id");
    expect(deriveCanonicalUrl("", "posts.$id").canonicalPath).toBe("/posts/:id");
    expect(deriveCanonicalUrl("posts/$id", "index").canonicalPath).toBe("/posts/:id");
    expect(deriveCanonicalUrl("", "$").canonicalPath).toBe("/*");
    expect(deriveCanonicalUrl("", "files.$").canonicalPath).toBe("/files/*");
    expect(deriveCanonicalUrl("files", "$").canonicalPath).toBe("/files/*");
    expect(deriveCanonicalUrl("", "sitemap[.]xml").canonicalPath).toBe("/sitemap.xml");
    expect(deriveCanonicalUrl("", "[_]private").canonicalPath).toBe("/_private");
    expect(deriveCanonicalUrl("_auth", "login").canonicalPath).toBe("/login");
    expect(deriveCanonicalUrl("_auth/users", "$id").canonicalPath).toBe("/users/:id");
  });

  it("derives canonical URL for breakout routes and bracket escaping", () => {
    expect(deriveCanonicalUrl("", "posts_.$id.preview").canonicalPath).toBe("/posts/:id/preview");
    expect(deriveCanonicalUrl("tasks", "$id_.complete").canonicalPath).toBe("/tasks/:id/complete");
    expect(deriveCanonicalUrl("", "health_").canonicalPath).toBe("/health");
    expect(deriveCanonicalUrl("", "index_").canonicalPath).toBe("/");
    expect(deriveCanonicalUrl("posts", "index_").canonicalPath).toBe("/posts");
    expect(deriveCanonicalUrl("", "posts_.index").canonicalPath).toBe("/posts");
    expect(deriveCanonicalUrl("", "$_").canonicalPath).toBe("/*");
    expect(deriveCanonicalUrl("files", "$_").canonicalPath).toBe("/files/*");
    expect(deriveCanonicalUrl("tasks", "task[_]").canonicalPath).toBe("/tasks/task_");
    expect(deriveCanonicalUrl("tasks", "task[_]_").canonicalPath).toBe("/tasks/task_");
    expect(deriveCanonicalUrl("_auth", "posts_.$id").canonicalPath).toBe("/posts/:id");
  });

  it("derives layout hierarchy segments and applies segment-targeted un-nesting", () => {
    // Standard routes
    expect(deriveCanonicalUrl("", "index").hierarchySegments).toEqual(["", "index"]);
    expect(deriveCanonicalUrl("admin", "users").hierarchySegments).toEqual([
      "",
      "admin",
      "admin/users",
    ]);

    // Root-level breakout bypasses root layout
    expect(deriveCanonicalUrl("", "health_").hierarchySegments).toEqual([]);
    expect(deriveCanonicalUrl("", "index_").hierarchySegments).toEqual([]);
    expect(deriveCanonicalUrl("", "$_").hierarchySegments).toEqual([]);

    // Resource root index breakout retains root but excludes resource layout
    expect(deriveCanonicalUrl("posts", "index_").hierarchySegments).toEqual([""]);
    expect(deriveCanonicalUrl("", "posts_.index").hierarchySegments).toEqual([""]);

    // Flat dot-notation breakout excludes target segment and descendants
    expect(deriveCanonicalUrl("", "posts_.$id.preview").hierarchySegments).toEqual([""]);
    expect(deriveCanonicalUrl("", "posts_.$id.sub").hierarchySegments).toEqual([""]);

    // Nested directory breakout retains ancestor layouts but excludes target segment
    expect(deriveCanonicalUrl("tasks", "$id_.complete").hierarchySegments).toEqual(["", "tasks"]);

    // Breakout route inside pathless group inherits pathless layout and root while excluding target
    expect(deriveCanonicalUrl("_auth", "posts_.$id").hierarchySegments).toEqual(["", "_auth"]);
  });

  it("derives layout info correctly", () => {
    const root = deriveLayoutInfo("", "$", "$.ts");
    expect(root.layoutId).toBe("/*");
    expect(root.targetSegment).toBe("");
    expect(root.isSibling).toBe(false);

    const siblingAdmin = deriveLayoutInfo("", "admin", "admin.ts");
    expect(siblingAdmin.layoutId).toBe("/admin/*");
    expect(siblingAdmin.targetSegment).toBe("admin");
    expect(siblingAdmin.isSibling).toBe(true);

    const nestedAdmin = deriveLayoutInfo("admin", "$", "admin/$.ts");
    expect(nestedAdmin.layoutId).toBe("/admin/*");
    expect(nestedAdmin.targetSegment).toBe("admin");
    expect(nestedAdmin.isSibling).toBe(false);

    const pathless = deriveLayoutInfo("", "_auth", "_auth.ts");
    expect(pathless.layoutId).toBe("/_auth/*");
    expect(pathless.targetSegment).toBe("_auth");

    const rootIndex = deriveLayoutInfo("", "index", "index.ts");
    expect(rootIndex.layoutId).toBe("/index/*");
    expect(rootIndex.targetSegment).toBe("index");
  });

  it("handles Windows-style backslash relative paths across utilities", () => {
    // isIgnoredPath
    expect(isIgnoredPath("-utils\\helper.ts")).toBe(true);
    expect(isIgnoredPath("admin\\-components\\button.tsx")).toBe(true);
    expect(isIgnoredPath("admin\\users.get.ts")).toBe(false);

    // parseFilePath with Windows backslashes
    const route = parseFilePath("admin\\users.get.ts", ["ts", "tsx"]);
    expect(route).toEqual({
      dir: "admin",
      name: "users.get",
      ext: "ts",
      verb: "get",
      stem: "users",
    });

    const nested = parseFilePath("nested\\sub\\$id.post.tsx", ["ts", "tsx"]);
    expect(nested).toEqual({
      dir: "nested/sub",
      name: "$id.post",
      ext: "tsx",
      verb: "post",
      stem: "$id",
    });

    const layout = parseFilePath("admin\\$.ts", ["ts", "tsx"]);
    expect(layout).toEqual({
      dir: "admin",
      name: "$",
      ext: "ts",
      verb: null,
      stem: "$",
    });

    // deriveCanonicalUrl with Windows-derived dir
    const canonical = deriveCanonicalUrl(route!.dir, route!.stem);
    expect(canonical.canonicalPath).toBe("/admin/users");
  });
});
