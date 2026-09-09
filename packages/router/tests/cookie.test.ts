import { describe, it, expect } from "vitest";
import { Context } from "hono";
import { TaserCookieJar, cookie } from "../src/cookie.js";

function createHonoContext(cookieHeader?: string): Context {
  const headers = new Headers();
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }
  const raw = new Request("http://localhost/test", { headers });
  return new Context(raw);
}

describe("TaserCookieJar", () => {
  it("reads cookies from request headers", () => {
    const c = createHonoContext("session=abc123; theme=dark");
    const jar = new TaserCookieJar(c);

    expect(jar.get("session")).toBe("abc123");
    expect(jar.get("theme")).toBe("dark");
    expect(jar.get("nonexistent")).toBeUndefined();
    expect(jar.get()).toEqual({
      session: "abc123",
      theme: "dark",
    });
  });

  it("supports secure and host prefix via Hono helper", () => {
    const c = createHonoContext("__Secure-token=sec123; __Host-id=host456");
    const jar = new TaserCookieJar(c);

    expect(jar.get("token", "secure")).toBe("sec123");
    expect(jar.get("id", "host")).toBe("host456");
  });

  it("sets cookies onto Hono context", () => {
    const c = createHonoContext();
    const jar = new TaserCookieJar(c);

    jar.set("session", "new-token", { httpOnly: true, secure: true });

    const headers = jar.getSetCookieHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("session=new-token");
    expect(headers[0]).toContain("HttpOnly");
    expect(headers[0]).toContain("Secure");
    expect(headers[0]).toContain("Path=/");
  });

  it("deletes cookies with Max-Age=0", () => {
    const c = createHonoContext("session=existing123");
    const jar = new TaserCookieJar(c);

    expect(jar.get("session")).toBe("existing123");

    const deleted = jar.delete("session");
    expect(deleted).toBe("existing123");

    const headers = jar.getSetCookieHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("session=");
    expect(headers[0]).toContain("Max-Age=0");
  });

  it("supports signed cookies with secret", async () => {
    const secret = "super-secret-signing-key-1234567";
    const c = createHonoContext();
    const jar = new TaserCookieJar(c, { secret });

    await jar.setSigned("signed_cookie", "payload", secret);
    const headers = jar.getSetCookieHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("signed_cookie=payload.");

    // Simulate incoming signed cookie request
    const signedValue = headers[0]!.split(";")[0]!;
    const verifyC = createHonoContext(signedValue);
    const verifyJar = new TaserCookieJar(verifyC, { secret });

    const verified = await verifyJar.getSigned("signed_cookie", secret);
    expect(verified).toBe("payload");

    const invalid = await verifyJar.getSigned("signed_cookie", "wrong-secret-key-1234567890");
    expect(invalid).toBe(false);
  });

  it("flushes accumulated Set-Cookie headers onto outgoing Response and is idempotent", () => {
    const c = createHonoContext();
    const jar = new TaserCookieJar(c);
    jar.set("a", "1");
    jar.set("b", "2");

    const originalRes = new Response("ok", { status: 200 });
    const flushedRes = jar.flush(originalRes);

    const cookies = flushedRes.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies.some((cookie) => cookie.includes("a=1"))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes("b=2"))).toBe(true);

    // Second flush does not duplicate
    const secondFlush = jar.flush(flushedRes);
    expect(secondFlush.headers.getSetCookie()).toHaveLength(2);
  });
});

describe("cookie() middleware", () => {
  it("provides cookies service and flushes Set-Cookie on unwinding", async () => {
    const c = createHonoContext("session=abc");
    const mw = cookie();

    let capturedIncomingCookie: string | undefined;

    const nextFn = Object.assign(async () => new Response("ok"), {
      provide: async (services: Record<string, any>) => {
        capturedIncomingCookie = services.cookies.get("session");
        services.cookies.set("user", "alice", { path: "/" });
        services.cookies.delete("session");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const res = await mw.handler({ req: {} as any, ctx: { context: c }, state: {} }, nextFn as any);

    expect(capturedIncomingCookie).toBe("abc");
    expect(res.status).toBe(200);

    const setCookies = res.headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(setCookies.some((cookie) => cookie.includes("user=alice"))).toBe(true);
    expect(
      setCookies.some((cookie) => cookie.includes("session=") && cookie.includes("Max-Age=0")),
    ).toBe(true);
  });
});
