import { Context } from "hono";
import { getCookie, getSignedCookie, setCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";
import { describe, it, expect, vi } from "vitest";

import {
  CookieJar,
  resolveCookieJarConfig,
  type CookieJarOptions,
} from "../src/middleware/cookie-jar.js";
import { cookie } from "../src/middleware/cookie.js";

const SECRET = "super-secret-signing-key-1234567";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EXPIRES_IN_ONE_WEEK = new Date(Math.floor(Date.now() / 1000) * 1000 + ONE_WEEK_MS);

async function thrownBy(action: () => unknown): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the action to throw");
}

function requestWithCookies(cookieHeader?: string): Request {
  return new Request("http://localhost/test", {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
}

function createJar(cookieHeader?: string, options?: CookieJarOptions): CookieJar {
  return new CookieJar(requestWithCookies(cookieHeader).headers, resolveCookieJarConfig(options));
}

function flushedCookies(jar: CookieJar): string[] {
  return jar.flush(new Response("ok")).headers.getSetCookie();
}

/** Hono's own helper on a real Context is the oracle for what the jar must emit. */
function honoSetCookies(name: string, value: string, options?: CookieOptions): string[] {
  const c = new Context(requestWithCookies());
  setCookie(c, name, value, options);
  return c.res.headers.getSetCookie();
}

describe("CookieJar reads", () => {
  const cookieHeaders = [
    "session=abc123; theme=dark",
    "__Secure-token=sec123; __Host-id=host456",
    "dup=first; dup=second",
    'quoted="hello world"',
    "encoded=a%20b%2Fc",
    "bad=%E0%A4%A; ok=1",
    "  spaced  =  value  ; other=2",
    "novalue; ok=1",
  ];

  it.each(cookieHeaders)("matches Hono getCookie for all cookies: %s", (header) => {
    const jar = createJar(header);
    const c = new Context(requestWithCookies(header));
    expect(jar.get()).toEqual(getCookie(c));
  });

  it.each(cookieHeaders)("matches Hono getCookie for single lookups: %s", (header) => {
    const jar = createJar(header);
    const c = new Context(requestWithCookies(header));
    const names = [
      "session",
      "theme",
      "dup",
      "quoted",
      "encoded",
      "bad",
      "ok",
      "spaced",
      "missing",
    ];
    for (const name of names) {
      expect(jar.get(name)).toBe(getCookie(c, name));
    }
    expect(jar.get("token", "secure")).toBe(getCookie(c, "token", "secure"));
    expect(jar.get("id", "host")).toBe(getCookie(c, "id", "host"));
  });

  it("returns undefined and an empty object when there is no Cookie header", () => {
    const jar = createJar();
    expect(jar.get("session")).toBeUndefined();
    expect(jar.get()).toEqual({});
  });

  it("reads the Cookie header once and only when a cookie is read", () => {
    const headers = requestWithCookies("a=1; b=2; c=3").headers;
    const getHeader = vi.spyOn(headers, "get");
    const jar = new CookieJar(headers, resolveCookieJarConfig());
    expect(getHeader).not.toHaveBeenCalled();

    jar.get("a");
    jar.get("b");
    jar.get();
    jar.get("c", "secure");
    expect(getHeader).toHaveBeenCalledTimes(1);
  });

  it("hands out copies so callers cannot corrupt later reads", () => {
    const jar = createJar("a=1");
    const all = jar.get();
    all.a = "tampered";
    delete all.a;
    expect(jar.get("a")).toBe("1");
    expect(jar.get()).toEqual({ a: "1" });
  });

  it("does not expose Object.prototype keys", () => {
    const jar = createJar("a=1");
    expect(jar.get("toString")).toBeUndefined();
    expect(jar.get("__proto__")).toBeUndefined();
    expect(Object.getPrototypeOf(jar.get())).toBeNull();
  });
});

describe("CookieJar writes", () => {
  const writeCases: Array<[string, string, CookieOptions | undefined]> = [
    ["plain", "value", undefined],
    ["http-only", "value", { httpOnly: true, secure: true }],
    ["same-site-lax", "value", { sameSite: "Lax" }],
    ["same-site-strict", "value", { sameSite: "Strict" }],
    ["same-site-none", "value", { sameSite: "None", secure: true }],
    ["with-path", "value", { path: "/admin" }],
    ["with-domain", "value", { domain: "example.com" }],
    ["with-max-age", "value", { maxAge: 3600 }],
    ["with-expires", "value", { expires: EXPIRES_IN_ONE_WEEK }],
    ["needs-encoding", "a b/c=d;e", undefined],
    ["partitioned", "value", { partitioned: true, secure: true }],
    ["secure-prefix", "value", { prefix: "secure" }],
    ["host-prefix", "value", { prefix: "host", domain: "example.com" }],
  ];

  it.each(writeCases)("emits what Hono setCookie emits for %s", (name, value, options) => {
    const jar = createJar();
    jar.set(name, value, options);
    expect(flushedCookies(jar)).toEqual(honoSetCookies(name, value, options));
  });

  it("applies mount defaults and lets per-call options override them", () => {
    const defaults: CookieJarOptions = { secret: SECRET, httpOnly: true, path: "/app", maxAge: 60 };
    const jar = createJar(undefined, defaults);
    jar.set("a", "1");
    jar.set("b", "2", { path: "/other", httpOnly: false });

    const { secret: _secret, ...honoDefaults } = defaults;
    expect(flushedCookies(jar)).toEqual([
      ...honoSetCookies("a", "1", honoDefaults),
      ...honoSetCookies("b", "2", { ...honoDefaults, path: "/other", httpOnly: false }),
    ]);
  });

  it("never leaks the signing secret into Set-Cookie", () => {
    const jar = createJar(undefined, { secret: SECRET });
    jar.set("a", "1");
    expect(flushedCookies(jar).join()).not.toContain(SECRET);
  });

  it("emits every call in order, including repeated names", () => {
    const jar = createJar();
    jar.set("a", "1").set("a", "2").set("b", "3");
    expect(flushedCookies(jar)).toEqual(["a=1; Path=/", "a=2; Path=/", "b=3; Path=/"]);
  });

  it("deletes with Max-Age=0 and returns the previous value", () => {
    const jar = createJar("session=existing123");
    expect(jar.delete("session")).toBe("existing123");
    expect(flushedCookies(jar)).toEqual(honoSetCookies("session", "", { maxAge: 0 }));
  });

  it("deletes with options and prefixes", () => {
    const jar = createJar("__Secure-token=abc", { path: "/app" });
    expect(jar.delete("token", { prefix: "secure" })).toBe("abc");
    expect(flushedCookies(jar)).toEqual(
      honoSetCookies("token", "", { path: "/app", prefix: "secure", maxAge: 0 }),
    );
  });

  it("returns undefined when deleting a cookie the request did not send", () => {
    expect(createJar().delete("ghost")).toBeUndefined();
  });

  it("rejects values Hono rejects", () => {
    const jar = createJar();
    expect(() => jar.set("a", "1", { maxAge: 400 * 24 * 60 * 60 + 1 })).toThrow();
  });
});

describe("CookieJar signed cookies", () => {
  async function signedRoundTrip(name: string, options?: CookieJarOptions) {
    const writer = createJar(undefined, { secret: SECRET, ...options });
    await writer.setSigned(name, "payload");
    const [setCookieHeader] = flushedCookies(writer);
    return setCookieHeader!.split(";")[0]!;
  }

  it("signs with the mount secret and verifies it", async () => {
    const pair = await signedRoundTrip("session");
    const reader = createJar(pair, { secret: SECRET });

    expect(await reader.getSigned("session")).toBe("payload");
    expect(await reader.getSigned("session", SECRET)).toBe("payload");
    expect(await reader.getSigned()).toEqual({ session: "payload" });
  });

  it("matches Hono for signed reads", async () => {
    const pair = await signedRoundTrip("session");
    const c = new Context(requestWithCookies(pair));
    const reader = createJar(pair, { secret: SECRET });

    expect(await reader.getSigned("session")).toBe(await getSignedCookie(c, SECRET, "session"));
    expect(await reader.getSigned("missing")).toBe(await getSignedCookie(c, SECRET, "missing"));
    expect(await reader.getSigned()).toEqual(await getSignedCookie(c, SECRET));
  });

  it("returns false for tampered values and wrong secrets", async () => {
    const pair = await signedRoundTrip("session");
    const reader = createJar(pair, { secret: SECRET });
    expect(await reader.getSigned("session", "wrong-secret-key-1234567890")).toBe(false);

    const tampered = createJar(pair.replace("payload", "forged"), { secret: SECRET });
    expect(await tampered.getSigned("session")).toBe(false);
  });

  it("returns undefined for a missing signed cookie or a missing Cookie header", async () => {
    expect(await createJar("other=1", { secret: SECRET }).getSigned("session")).toBeUndefined();
    expect(await createJar(undefined, { secret: SECRET }).getSigned("session")).toBeUndefined();
    expect(await createJar(undefined, { secret: SECRET }).getSigned()).toEqual({});
  });

  it("supports prefixes and per-call options", async () => {
    const writer = createJar(undefined, { secret: SECRET });
    await writer.setSigned("token", "payload", { prefix: "secure" });
    const [header] = flushedCookies(writer);
    expect(header).toContain("__Secure-token=payload.");
    expect(header).toContain("Secure");

    const reader = createJar(header!.split(";")[0], { secret: SECRET });
    expect(await reader.getSigned("token", undefined, "secure")).toBe("payload");
  });

  it("accepts a BufferSource secret", async () => {
    const secret = new TextEncoder().encode(SECRET);
    const writer = createJar();
    await writer.setSigned("s", "payload", secret);
    const pair = flushedCookies(writer)[0]!.split(";")[0]!;
    expect(await createJar(pair).getSigned("s", secret)).toBe("payload");
  });

  it("requires a secret to sign or to read all signed cookies", async () => {
    await expect(createJar().setSigned("a", "1")).rejects.toThrow("Secret is required");
    await expect(createJar("a=1").getSigned()).rejects.toThrow("Secret is required");
  });

  it("does not queue anything when signing fails", async () => {
    const jar = createJar();
    await expect(jar.setSigned("a", "1")).rejects.toThrow();
    const res = new Response("ok");
    expect(jar.flush(res)).toBe(res);
  });
});

describe("CookieJar flush", () => {
  it("returns the same response when nothing was queued", () => {
    const res = new Response("ok");
    expect(createJar().flush(res)).toBe(res);
  });

  it("appends queued cookies once, even when flushed again", () => {
    const jar = createJar();
    jar.set("a", "1");
    jar.set("b", "2");

    const flushed = jar.flush(new Response("ok"));
    expect(flushed.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
    expect(jar.flush(flushed).headers.getSetCookie()).toHaveLength(2);
  });

  it("keeps Set-Cookie headers the response already carries", () => {
    const jar = createJar();
    jar.set("jar", "1");
    const res = new Response("ok", { headers: { "set-cookie": "own=1; Path=/x" } });

    expect(jar.flush(res).headers.getSetCookie()).toEqual(["own=1; Path=/x", "jar=1; Path=/"]);
  });

  it("rebuilds responses with immutable headers and keeps status and expandos", () => {
    const jar = createJar();
    jar.set("a", "1");
    const redirect = Response.redirect("http://localhost/next", 302);
    (redirect as any)._data = null;
    (redirect as any)._status = 302;

    const flushed = jar.flush(redirect);
    expect(flushed).not.toBe(redirect);
    expect(flushed.status).toBe(302);
    expect(flushed.headers.get("location")).toBe("http://localhost/next");
    expect(flushed.headers.getSetCookie()).toEqual(["a=1; Path=/"]);
    expect((flushed as any)._status).toBe(302);
    expect("_data" in flushed).toBe(true);
  });

  it("rebuilds an immutable response that has a body", async () => {
    const jar = createJar();
    jar.set("a", "1");
    const immutable = Response.json({ ok: true });
    Object.defineProperty(immutable.headers, "append", {
      value() {
        throw new TypeError("immutable");
      },
    });

    const flushed = jar.flush(immutable);
    expect(await flushed.json()).toEqual({ ok: true });
    expect(flushed.headers.getSetCookie()).toEqual(["a=1; Path=/"]);
  });
});

describe("cookie() middleware", () => {
  function run(
    request: Request,
    inside: (services: { cookies: any }) => Promise<Response>,
    options?: CookieJarOptions,
    honoContext?: Context,
  ) {
    const next = Object.assign(async () => new Response("unused"), {
      provide: async (services: Record<string, any>) => inside(services as { cookies: any }),
    });
    return cookie(options).handler(
      { req: { raw: request } as any, ctx: { context: honoContext }, state: {} },
      next as any,
    );
  }

  it("provides the jar and flushes Set-Cookie on unwinding", async () => {
    let incoming: string | undefined;
    const res = await run(requestWithCookies("session=abc"), async ({ cookies }) => {
      incoming = cookies.get("session");
      cookies.set("user", "alice", { path: "/" });
      cookies.delete("session");
      return new Response("ok");
    });

    expect(incoming).toBe("abc");
    const cookiesOut = res.headers.getSetCookie();
    expect(cookiesOut).toHaveLength(2);
    expect(cookiesOut.some((value) => value.includes("user=alice"))).toBe(true);
    expect(
      cookiesOut.some((value) => value.includes("session=") && value.includes("Max-Age=0")),
    ).toBe(true);
  });

  it("passes untouched responses through without copying", async () => {
    const original = new Response("ok");
    const res = await run(requestWithCookies(), async () => original);
    expect(res).toBe(original);
  });

  it("writes cookies onto a thrown Response and rethrows it", async () => {
    const thrown = await thrownBy(() =>
      run(requestWithCookies(), async ({ cookies }) => {
        cookies.set("a", "1");
        throw new Response("denied", { status: 403 });
      }),
    );

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
    expect((thrown as Response).headers.getSetCookie()).toEqual(["a=1; Path=/"]);
  });

  it("hands cookies to the Hono context for thrown errors and rethrows the same error", async () => {
    const honoContext = new Context(requestWithCookies());
    const failure = new Error("boom");

    const thrown = await thrownBy(() =>
      run(
        requestWithCookies(),
        async ({ cookies }) => {
          cookies.set("a", "1");
          throw failure;
        },
        undefined,
        honoContext,
      ),
    );

    expect(thrown).toBe(failure);
    expect(honoContext.text("failed", 500).headers.getSetCookie()).toEqual(["a=1; Path=/"]);
  });

  it("rethrows errors when no Hono context is available", async () => {
    const failure = new Error("boom");
    await expect(
      run(requestWithCookies(), async ({ cookies }) => {
        cookies.set("a", "1");
        throw failure;
      }),
    ).rejects.toBe(failure);
  });

  it("gives each request its own jar", async () => {
    const options: CookieJarOptions = { secret: SECRET };
    const first = await run(
      requestWithCookies(),
      async ({ cookies }) => {
        cookies.set("a", "1");
        return new Response("ok");
      },
      options,
    );
    const second = await run(requestWithCookies(), async () => new Response("ok"), options);

    expect(first.headers.getSetCookie()).toHaveLength(1);
    expect(second.headers.getSetCookie()).toHaveLength(0);
  });
});
