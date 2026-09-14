import { describe, expect, it } from "vitest";
import {
  deriveCanonicalUrl,
  deriveLayoutInfo,
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

    const routeHead = parseFilePath("health.head.ts", ["ts", "tsx"]);
    expect(routeHead).toEqual({
      dir: "",
      name: "health.head",
      ext: "ts",
      verb: "head",
      stem: "health",
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
