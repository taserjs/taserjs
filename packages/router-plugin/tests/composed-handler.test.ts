import { describe, expect, it } from "vitest";

import {
  createComposedHandler,
  extractPathname,
  matchesScope,
  normalizeScope,
  resolveHostFetch,
} from "../src/runtime/index.js";
import { getComposedAppCode } from "../src/core/compose.js";

describe("runtime createComposedHandler", () => {
  it("extracts pathname accurately without URL allocations", () => {
    expect(extractPathname("http://localhost:3000/api/users?page=1")).toBe("/api/users");
    expect(extractPathname("https://example.com/")).toBe("/");
    expect(extractPathname("https://example.com")).toBe("/");
    expect(extractPathname("/api/hello?query=true")).toBe("/api/hello");
    expect(extractPathname("/")).toBe("/");
  });

  it("normalizes and matches scope correctly", () => {
    const scope = normalizeScope("/api");
    expect(scope).toBe("/api");
    expect(matchesScope("/api", scope!)).toBe(true);
    expect(matchesScope("/api/users", scope!)).toBe(true);
    expect(matchesScope("/apiv2", scope!)).toBe(false);
    expect(matchesScope("/home", scope!)).toBe(false);
  });

  it("fast-path when there is no host server and no scope", async () => {
    const taserRoutesApp = {
      fetch: async (req: Request) => {
        if (extractPathname(req.url) === "/hello") {
          return new Response("from-taser");
        }
        return undefined;
      },
    };

    const handler = createComposedHandler({
      taserRoutesApp,
    });

    const res1 = await handler(new Request("http://localhost/hello"));
    expect(await res1.text()).toBe("from-taser");

    const res2 = await handler(new Request("http://localhost/not-found"));
    expect(res2.status).toBe(404);
  });

  it("fast-path when there is no host server with scope", async () => {
    const taserRoutesApp = {
      fetch: async (req: Request) => {
        if (extractPathname(req.url) === "/api/hello") {
          return new Response("from-taser-scoped");
        }
        return undefined;
      },
    };

    const handler = createComposedHandler({
      taserRoutesApp,
      scope: "/api",
    });

    const res1 = await handler(new Request("http://localhost/api/hello"));
    expect(await res1.text()).toBe("from-taser-scoped");

    const res2 = await handler(new Request("http://localhost/other"));
    expect(res2.status).toBe(404);
  });

  it("taser always dispatches first when host is present", async () => {
    const taserRoutesApp = {
      fetch: async (req: Request) => {
        if (extractPathname(req.url) === "/api/hello") {
          return new Response("from-taser");
        }
        return undefined;
      },
    };
    const hostServer = {
      fetch: async (_req: Request) => {
        return new Response("from-host");
      },
    };

    const handler = createComposedHandler({
      taserRoutesApp,
      hostServer,
      scope: "/api",
    });

    const res1 = await handler(new Request("http://localhost/api/hello"));
    expect(await res1.text()).toBe("from-taser");

    const res2 = await handler(new Request("http://localhost/other"));
    expect(await res2.text()).toBe("from-host");
  });
});

describe("runtime resolveHostFetch", () => {
  it("resolves fetch-native hosts via their .fetch method", async () => {
    const host = { fetch: async () => new Response("ok-fetch") };
    const fn = await resolveHostFetch(host);
    expect(fn).not.toBeNull();
    const res = await fn!(new Request("http://localhost/"));
    expect(await res?.text()).toBe("ok-fetch");
  });

  it("resolves default-exported fetch-native hosts", async () => {
    const host = { default: { fetch: async () => new Response("ok-default") } };
    const fn = await resolveHostFetch(host);
    expect(fn).not.toBeNull();
    const res = await fn!(new Request("http://localhost/"));
    expect(await res?.text()).toBe("ok-default");
  });

  it("auto-wraps bare Node-style callables with srvx toFetchHandler", async () => {
    const host = (req: any, res: any) => {
      res.statusCode = 200;
      res.end("bare-node");
    };
    const fn = await resolveHostFetch(host);
    expect(fn).not.toBeNull();
    const res = await fn!(new Request("http://localhost/"));
    expect(await res?.text()).toBe("bare-node");
  });

  it("handles standard fetch function", async () => {
    const host = async () => new Response("direct-fetch");
    const fn = await resolveHostFetch(host);
    expect(fn).not.toBeNull();
    const res = await fn!(new Request("http://localhost/"));
    expect(await res?.text()).toBe("direct-fetch");
  });

  it("returns null for unrecognized or null host objects", async () => {
    expect(await resolveHostFetch(null)).toBeNull();
    expect(await resolveHostFetch(undefined)).toBeNull();
    expect(await resolveHostFetch({})).toBeNull();
  });
});

describe("getComposedAppCode without host", () => {
  it("emits code delegating to createComposedHandler without hostServer", () => {
    const code = getComposedAppCode({ scope: "/" });
    expect(code).not.toContain("hostServer");
    expect(code).toContain(
      'import { createComposedHandler } from "@taserjs/router-plugin/runtime"',
    );
  });
});
