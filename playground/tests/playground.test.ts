import {
  compareBySegments,
  deriveCanonicalUrl,
  deriveLayoutInfo,
  isIgnoredPath,
  layoutStub,
  middlewareContentStub,
  parseFilePath,
  routeStub,
} from "@taserjs/cli/codegen";
import { describe, expect, it } from "vitest";

import { PIN_NAMES, resolvePin } from "../src/pins";

function scaffoldFor(
  absPath: string,
  kind: "file" | "folder",
): { path: string; content: string } | null {
  if (kind === "folder") return { path: `${absPath}/.gitkeep`, content: "" };
  const rel = absPath.startsWith("/") ? absPath.slice(1) : absPath;

  if (rel.startsWith("routes/")) {
    const routesRel = rel.slice("routes/".length);
    if (!routesRel || isIgnoredPath(routesRel)) {
      return { path: absPath, content: "" };
    }
    const parsed = parseFilePath(routesRel);
    if (!parsed) {
      return { path: absPath, content: "" };
    }
    if (parsed.verb !== null) {
      let canonicalPath = "/";
      try {
        canonicalPath = deriveCanonicalUrl(parsed.dir, parsed.stem).canonicalPath;
      } catch {
        // scanner diagnostics will explain the fix; fall through with the stub
      }
      return { path: absPath, content: routeStub(parsed.verb.toUpperCase(), canonicalPath) };
    }
    try {
      const info = deriveLayoutInfo(parsed.dir, parsed.stem);
      return { path: absPath, content: layoutStub(info.layoutId) };
    } catch {
      return { path: absPath, content: "" };
    }
  }

  if (rel.startsWith("middlewares/")) {
    const midRel = rel.slice("middlewares/".length);
    const match = midRel.match(/^([^/]+)\.(ts|tsx)$/);
    if (match) {
      const base = match[1]!;
      const camel = base
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part, index) =>
          index === 0 ? part.toLowerCase() : part[0]!.toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join("");
      return { path: absPath, content: middlewareContentStub(camel || "middleware") };
    }
  }

  return { path: absPath, content: "" };
}

function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_./$[\]{}-]/g, "-");
}

describe("playground pins", () => {
  it("exports compareBySegments from codegen and compares paths stably", () => {
    const list = ["routes/b.ts", "routes/a.ts"];
    list.sort(compareBySegments);
    expect(list).toEqual(["routes/a.ts", "routes/b.ts"]);
  });

  it("includes all specs and runtime dependencies in pinned names", () => {
    expect(PIN_NAMES).toContain("hono");
    expect(PIN_NAMES).toContain("@standard-schema/spec");
    expect(PIN_NAMES).toContain("zod");
    expect(PIN_NAMES).toContain("@taserjs/runtime");
    expect(PIN_NAMES).toContain("@taserjs/router");
    expect(PIN_NAMES).toContain("@taserjs/client");
    expect(PIN_NAMES).toContain("@taserjs/utils");
  });

  it("resolves pins to correct esm.sh URLs", () => {
    expect(resolvePin("hono")).toBe("https://esm.sh/hono@4.13.7");
    expect(resolvePin("hono/quick")).toBe("https://esm.sh/hono@4.13.7/quick");
    expect(resolvePin("@standard-schema/spec")).toBe("https://esm.sh/@standard-schema/spec@1.1.0");
    expect(resolvePin("zod")).toBe("https://esm.sh/zod@4.6.7");
    expect(resolvePin("@taserjs/router/reply")).toBe("https://esm.sh/@taserjs/router@0.3.0/reply");
  });

  it("returns null for unknown bare imports", () => {
    expect(resolvePin("express")).toBeNull();
    expect(resolvePin("lodash")).toBeNull();
  });
});

describe("playground file tree scaffolding & name sanitization", () => {
  it("preserves optional param braces { and } in name sanitization", () => {
    expect(sanitizeName("{-$name}.get.ts")).toBe("{-$name}.get.ts");
    expect(sanitizeName("users/{-$id}.get.ts")).toBe("users/{-$id}.get.ts");
    expect(sanitizeName("special@file#name.ts")).toBe("special-file-name.ts");
  });

  it("scaffolds nested layout files properly", () => {
    const adminNested = scaffoldFor("/routes/admin/$.ts", "file");
    expect(adminNested).not.toBeNull();
    expect(adminNested?.content).toContain('t.layout("/admin/*")');

    const rootLayout = scaffoldFor("/routes/$.ts", "file");
    expect(rootLayout).not.toBeNull();
    expect(rootLayout?.content).toContain('t.layout("/*")');

    const siblingLayout = scaffoldFor("/routes/admin.ts", "file");
    expect(siblingLayout).not.toBeNull();
    expect(siblingLayout?.content).toContain('t.layout("/admin/*")');
  });

  it("scaffolds all verbs and tsx route files properly", () => {
    for (const verb of [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "options",
      "query",
      "all",
      "any",
    ]) {
      const res = scaffoldFor(`/routes/test.${verb}.ts`, "file");
      expect(res).not.toBeNull();
      if (verb === "any") {
        expect(res?.content).toContain('t.any("/test", ["GET", "POST"])');
      } else {
        expect(res?.content).toContain(`t.${verb}("/test")`);
      }
    }

    const tsxRoute = scaffoldFor("/routes/page.get.tsx", "file");
    expect(tsxRoute).not.toBeNull();
    expect(tsxRoute?.content).toContain('t.get("/page")');
  });

  it("scaffolds optional route parameters correctly", () => {
    const opt = scaffoldFor("/routes/users/{-$id}.get.ts", "file");
    expect(opt).not.toBeNull();
    expect(opt?.content).toContain('t.get("/users/:id?")');
  });

  it("scaffolds middleware files properly", () => {
    const mid = scaffoldFor("/middlewares/auth-check.ts", "file");
    expect(mid).not.toBeNull();
    expect(mid?.content).toContain("export const authCheck = middleware()");
  });
});
