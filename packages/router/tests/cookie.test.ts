import { describe, it, expect } from "vitest";
import { Context } from "hono";
import { TaserCookieJar, cookie } from "../src/cookie.js";
import type { TaserRequest } from "../src/index.js";

function createDummyRequest(cookieHeader?: string): TaserRequest {
  const headers = new Headers();
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }
  const raw = new Request("http://localhost/test", { headers });
  return {
    params: {},
    query: {},
    headers: raw.headers as any,
    method: "GET",
    url: raw.url,
    raw,
  };
}

describe("TaserCookieJar", () => {
  it("reads cookies from request headers", () => {
    const req = createDummyRequest("session=abc123; theme=dark");
    const jar = new TaserCookieJar(req);

    expect(jar.get("session")).toBe("abc123");
    expect(jar.get("theme")).toBe("dark");
    expect(jar.get("nonexistent")).toBeUndefined();
    expect(jar.get()).toEqual({
      session: "abc123",
      theme: "dark",
    });
  });

  it("reads cookies from Hono Context", () => {
    const raw = new Request("http://localhost/test", {
      headers: { Cookie: "user_id=42" },
    });
    const c = new Context(raw);
    const jar = new TaserCookieJar(c);

    expect(jar.get("user_id")).toBe("42");
  });

  it("buffers set operations and updates in-memory get()", () => {
    const req = createDummyRequest();
    const jar = new TaserCookieJar(req);

    jar.set("session", "new-token", { httpOnly: true, secure: true });
    expect(jar.get("session")).toBe("new-token");

    const headers = jar.getSetCookieHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("session=new-token");
    expect(headers[0]).toContain("HttpOnly");
    expect(headers[0]).toContain("Secure");
    expect(headers[0]).toContain("Path=/");
  });

  it("overwrites earlier buffered set for the same cookie name", () => {
    const req = createDummyRequest();
    const jar = new TaserCookieJar(req);

    jar.set("theme", "light");
    jar.set("theme", "dark");

    expect(jar.get("theme")).toBe("dark");
    const headers = jar.getSetCookieHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("theme=dark");
  });

  it("buffers delete operations with Max-Age=0 and updates get()", () => {
    const req = createDummyRequest("session=existing123");
    const jar = new TaserCookieJar(req);

    expect(jar.get("session")).toBe("existing123");

    jar.delete("session");
    expect(jar.get("session")).toBeUndefined();

    const headers = jar.getSetCookieHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("session=");
    expect(headers[0]).toContain("Max-Age=0");
  });

  it("supports signed cookies with secret", async () => {
    const secret = "super-secret-signing-key-1234567";
    const jar = new TaserCookieJar(createDummyRequest(), { secret });

    await jar.setSigned("signed_cookie", "payload", secret);
    const headers = jar.getSetCookieHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("signed_cookie=payload.");

    // Simulate incoming signed cookie request
    const signedValue = headers[0]!.split(";")[0]!;
    const reqWithSigned = createDummyRequest(signedValue);
    const verifyJar = new TaserCookieJar(reqWithSigned, { secret });

    const verified = await verifyJar.getSigned("signed_cookie", secret);
    expect(verified).toBe("payload");

    const invalid = await verifyJar.getSigned("signed_cookie", "wrong-secret-key-1234567890");
    expect(invalid).toBe(false);
  });

  it("flushes accumulated Set-Cookie headers onto outgoing Response and is idempotent", () => {
    const jar = new TaserCookieJar(createDummyRequest());
    jar.set("a", "1");
    jar.set("b", "2");

    const originalRes = new Response("ok", { status: 200 });
    const flushedRes = jar.flush(originalRes);

    const cookies = flushedRes.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies.some((c) => c.includes("a=1"))).toBe(true);
    expect(cookies.some((c) => c.includes("b=2"))).toBe(true);

    // Second flush does not re-add
    const secondFlush = jar.flush(flushedRes);
    expect(secondFlush.headers.getSetCookie()).toHaveLength(2);
  });
});

describe("cookie() middleware", () => {
  it("provides cookies service and flushes Set-Cookie on unwinding", async () => {
    const req = createDummyRequest("session=abc");
    const mw = cookie();

    let capturedIncomingCookie: string | undefined;

    const nextFn = Object.assign(
      async () => new Response("ok"),
      {
        provide: async (services: Record<string, any>) => {
          capturedIncomingCookie = services.cookies.get("session");
          services.cookies.set("user", "alice", { path: "/" });
          services.cookies.delete("session");
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        },
      }
    );

    const res = await mw.handler({ req, ctx: {}, state: {} }, nextFn as any);

    expect(capturedIncomingCookie).toBe("abc");
    expect(res.status).toBe(200);

    const setCookies = res.headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(setCookies.some((c) => c.includes("user=alice"))).toBe(true);
    expect(setCookies.some((c) => c.includes("session=") && c.includes("Max-Age=0"))).toBe(true);
  });
});
