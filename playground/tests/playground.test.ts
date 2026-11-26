import { compareBySegments } from "@taserjs/cli/codegen";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { computeVisibleRouteCount } from "../src/components/RoutePickerBar";
import { HTTP_METHODS } from "../src/method-styles";
import { decode, encodeState } from "../src/persist";
import { PIN_NAMES, resolvePin } from "../src/pins";
import {
  buildFileTree,
  getFileMeta,
  resolveCreateTarget,
  sanitizeEntryName,
  scaffoldFor,
} from "../src/scaffold";
import { extractRootCall } from "../src/scan";
import { clearShortenCache, isPublicShareUrl, shortenUrl } from "../src/shorten";
import { isGeneratedPath, isHiddenPath, Vfs, type VfsEvent } from "../src/vfs";

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

  it("returns null for unknown bare imports and Object.prototype keys", () => {
    expect(resolvePin("express")).toBeNull();
    expect(resolvePin("lodash")).toBeNull();
    expect(resolvePin("toString")).toBeNull();
    expect(resolvePin("constructor")).toBeNull();
    expect(resolvePin("__proto__")).toBeNull();
  });
});

describe("playground VFS & hidden generated files", () => {
  it("treats /.taserjs/* and .gitkeep as hidden paths", () => {
    expect(isGeneratedPath("/.taserjs/routes.gen.ts")).toBe(true);
    expect(isGeneratedPath("/.taserjs")).toBe(true);
    expect(isGeneratedPath("/routes/index.get.ts")).toBe(false);

    expect(isHiddenPath("/.taserjs/routes.gen.ts")).toBe(true);
    expect(isHiddenPath("/routes/empty/.gitkeep")).toBe(true);
    expect(isHiddenPath("/routes/index.get.ts")).toBe(false);
  });

  it("excludes generated files from listVisible() and userSnapshot()", () => {
    const store = new Vfs();
    store.write("/taser.ts", "export default {};", "ui");
    store.write("/routes/index.get.ts", "export default {};", "ui");
    store.write("/.taserjs/routes.gen.ts", "// generated", "codegen");

    expect(store.list()).toContain("/.taserjs/routes.gen.ts");
    expect(store.listVisible()).toEqual(["/routes/index.get.ts", "/taser.ts"]);
    expect(store.userSnapshot()).toEqual({
      "/taser.ts": "export default {};",
      "/routes/index.get.ts": "export default {};",
    });
  });

  it("strips hidden generated files when decoding persisted hashes", () => {
    const encoded = encodeState(
      {
        "/.taserjs/routes.gen.ts": "// stale generated",
        "/routes/index.get.ts": "export default {};",
      },
      "/.taserjs/routes.gen.ts",
    );
    const decoded = decode(encoded);
    expect(decoded).toEqual({
      files: { "/routes/index.get.ts": "export default {};" },
      active: "/routes/index.get.ts",
    });
  });

  it("rejects decoded snapshots containing invalid VFS paths", () => {
    const relativeKey = encodeState({ "routes/index.get.ts": "export default {};" }, null);
    const traversalKey = encodeState({ "/routes/../secret.ts": "export default {};" }, null);
    expect(decode(relativeKey)).toBeNull();
    expect(decode(traversalKey)).toBeNull();
  });

  it("marks rename unlinks with movedTo so tabs are not closed as deletions", () => {
    const store = new Vfs();
    store.write("/routes/a.get.ts", "export default {};", "ui");
    const events: VfsEvent[] = [];
    store.watch((event) => events.push(event));

    store.rename("/routes/a.get.ts", "/routes/b.get.ts", "ui");
    expect(events).toEqual([
      { type: "add", path: "/routes/b.get.ts", origin: "ui" },
      { type: "unlink", path: "/routes/a.get.ts", origin: "ui", movedTo: "/routes/b.get.ts" },
    ]);

    events.length = 0;
    store.remove("/routes/b.get.ts", "ui");
    expect(events).toEqual([{ type: "unlink", path: "/routes/b.get.ts", origin: "ui" }]);
  });
});

describe("playground scaffolding, sanitization, and tree model", () => {
  it("preserves optional param braces { and } in name sanitization", () => {
    expect(sanitizeEntryName("{-$name}.get.ts")).toBe("{-$name}.get.ts");
    expect(sanitizeEntryName("users/{-$id}.get.ts")).toBe("users/{-$id}.get.ts");
    expect(sanitizeEntryName("special@file#name.ts")).toBe("special-file-name.ts");
  });

  it("appends .ts for extension-less files and bare HTTP verb suffixes", () => {
    expect(resolveCreateTarget("/routes", "health.get", "file")).toBe("/routes/health.get.ts");
    expect(resolveCreateTarget("/routes", "admin", "file")).toBe("/routes/admin.ts");
    expect(resolveCreateTarget("/", "notes.md", "file")).toBe("/notes.md");
    expect(resolveCreateTarget("/routes", "admin", "folder")).toBe("/routes/admin");
  });

  it("scaffolds nested and sibling layout files properly", () => {
    expect(scaffoldFor("/routes/admin/$.ts").content).toContain('t.layout("/admin/*")');
    expect(scaffoldFor("/routes/$.ts").content).toContain('t.layout("/*")');
    expect(scaffoldFor("/routes/admin.ts").content).toContain('t.layout("/admin/*")');
  });

  it("scaffolds all HTTP verbs and tsx route files properly", () => {
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
      const res = scaffoldFor(`/routes/test.${verb}.ts`);
      if (verb === "any") {
        expect(res.content).toContain('t.any("/test", ["GET", "POST"])');
      } else {
        expect(res.content).toContain(`t.${verb}("/test")`);
      }
    }

    expect(scaffoldFor("/routes/page.get.tsx").content).toContain('t.get("/page")');
  });

  it("scaffolds optional route parameters and leaves non-route files empty", () => {
    expect(scaffoldFor("/routes/users/{-$id}.get.ts").content).toContain('t.get("/users/:id?")');
    expect(scaffoldFor("/lib/helper.ts")).toEqual({ path: "/lib/helper.ts", content: "" });
  });

  it("derives file metadata for routes, layouts, and app config", () => {
    expect(getFileMeta("/taser.ts")).toEqual({ kind: "config" });
    expect(getFileMeta("/routes/users/$id.get.ts")).toEqual({
      kind: "route",
      method: "GET",
      canonicalPath: "/users/:id",
    });
    expect(getFileMeta("/routes/$.ts")).toEqual({ kind: "layout", layoutId: "/*" });
  });

  it("builds a folder-first tree including empty folders without .gitkeep files", () => {
    const tree = buildFileTree(["/taser.ts", "/routes/index.get.ts"], ["/middlewares"]);
    expect(tree.children.map((node) => `${node.isFolder ? "d" : "f"}:${node.name}`)).toEqual([
      "d:middlewares",
      "d:routes",
      "f:taser.ts",
    ]);
  });
});

describe("adaptive route picker overflow math", () => {
  it("shows every route when all pills fit without needing an overflow trigger", () => {
    expect(computeVisibleRouteCount([60, 80, 90], 250, 56, 6)).toBe(3);
  });

  it("reserves room for the overflow button when pills exceed available width", () => {
    // All 3 take 60 + 6 + 80 + 6 + 90 = 242px (> 220px).
    // Budget with overflow button = 220 - 56 = 164px.
    // Pill 0: 60 + 6 = 66 <= 164; Pill 1: 66 + 80 + 6 = 152 <= 164; Pill 2: 152 + 96 > 164.
    expect(computeVisibleRouteCount([60, 80, 90], 220, 56, 6)).toBe(2);
  });

  it("returns 0 when even the first pill plus overflow trigger does not fit", () => {
    expect(computeVisibleRouteCount([140, 120], 160, 56, 6)).toBe(0);
    expect(computeVisibleRouteCount([], 300, 56, 6)).toBe(0);
  });
});

describe("playground URL shortener (spoo.me + da.gd fallback)", () => {
  beforeEach(() => {
    clearShortenCache();
  });

  it("identifies public vs localhost/private URLs", () => {
    expect(isPublicShareUrl("https://play.taserjs.dev/#abc")).toBe(true);
    expect(isPublicShareUrl("http://localhost:5173/#abc")).toBe(false);
    expect(isPublicShareUrl("http://127.0.0.1:4173/#abc")).toBe(false);
    expect(isPublicShareUrl("http://app.local/#abc")).toBe(false);
  });

  it("skips network requests on localhost origins", async () => {
    const mockFetch = vi.fn();
    const res = await shortenUrl(
      "http://localhost:5173/#abc",
      mockFetch as unknown as typeof fetch,
    );
    expect(res).toEqual({
      url: "http://localhost:5173/#abc",
      shortened: false,
      reason: "local-origin",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shortens via spoo.me first and caches subsequent calls for the same URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ short_url: "https://spoo.me/taser1" }),
    });

    const target = "https://play.taserjs.dev/#N4Igtest";
    const first = await shortenUrl(target, mockFetch as unknown as typeof fetch);
    const second = await shortenUrl(target, mockFetch as unknown as typeof fetch);

    expect(first).toEqual({
      url: "https://spoo.me/taser1",
      shortened: true,
      provider: "spoo.me",
    });
    expect(second).toEqual(first);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to da.gd when spoo.me fails", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "https://da.gd/taser2\n",
      });

    const res = await shortenUrl(
      "https://play.taserjs.dev/#N4Igfallback",
      mockFetch as unknown as typeof fetch,
    );
    expect(res).toEqual({
      url: "https://da.gd/taser2",
      shortened: true,
      provider: "da.gd",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns original URL when both providers fail or URL exceeds 8,192 chars", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network down"));
    const failed = await shortenUrl(
      "https://play.taserjs.dev/#offline",
      mockFetch as unknown as typeof fetch,
    );
    expect(failed).toEqual({
      url: "https://play.taserjs.dev/#offline",
      shortened: false,
      reason: "unavailable",
    });

    const hugeUrl = `https://play.taserjs.dev/#${"a".repeat(8200)}`;
    const mockUnused = vi.fn();
    const oversized = await shortenUrl(hugeUrl, mockUnused as unknown as typeof fetch);
    expect(oversized).toEqual({
      url: hugeUrl,
      shortened: false,
      reason: "too-long",
    });
    expect(mockUnused).not.toHaveBeenCalled();
  });
});

describe("playground route scanner & HTTP method support", () => {
  it("preserves t.layout('/*') when followed by a block comment", () => {
    const source = `
import { t } from "@taserjs/router";
export default t.layout("/*").use(async (_args, next) => {
  /* measure request timing */
  return await next();
});
`;
    expect(extractRootCall(source)).toEqual({ verb: "layout", path: "/*" });
  });

  it("prefers the default-exported route call over earlier local builders", () => {
    const direct = `
import { t } from "@taserjs/router";
const health = t.get("/health");
export default t.get("/users").handler(async () => new Response("ok"));
`;
    expect(extractRootCall(direct)).toEqual({ verb: "get", path: "/users" });

    const bound = `
import { t } from "@taserjs/router";
const health = t.get("/health");
const usersRoute = t.post("/users").handler(async () => new Response("ok"));
export default usersRoute;
`;
    expect(extractRootCall(bound)).toEqual({ verb: "post", path: "/users" });
  });

  it("supports OPTIONS and QUERY in HTTP_METHODS", () => {
    expect(HTTP_METHODS).toContain("OPTIONS");
    expect(HTTP_METHODS).toContain("QUERY");
  });
});
