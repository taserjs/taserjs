import { describe, expect, it } from "vitest";

import { createTaserCookieJar } from "../src/index.js";

describe("createTaserCookieJar defaults", () => {
  it("applies HttpOnly, Secure, and SameSite=Lax by default on set()", () => {
    const jar = createTaserCookieJar(null);
    jar.set("session", "abc");
    const response = jar.applyTo(new Response());
    const cookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")!];
    const serialized = cookies.join("; ");
    expect(serialized).toContain("session=abc");
    expect(serialized).toMatch(/HttpOnly/i);
    expect(serialized).toMatch(/Secure/i);
    expect(serialized).toMatch(/SameSite=Lax/i);
    expect(serialized).toMatch(/Path=\//);
  });

  it("uses app defaults from createTaserApp cookies config", () => {
    const jar = createTaserCookieJar(null, undefined, { httpOnly: false, secure: false });
    jar.set("session", "abc");
    const response = jar.applyTo(new Response());
    const serialized = (
      response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")!]
    ).join("; ");
    expect(serialized).not.toMatch(/HttpOnly/i);
    expect(serialized).not.toMatch(/Secure/i);
    expect(serialized).toMatch(/SameSite=Lax/i);
  });

  it("per-call options override app defaults", () => {
    const jar = createTaserCookieJar(null, undefined, { httpOnly: true, secure: true });
    jar.set("session", "abc", { httpOnly: false, secure: false });
    const response = jar.applyTo(new Response());
    const serialized = (
      response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")!]
    ).join("; ");
    expect(serialized).not.toMatch(/HttpOnly/i);
    expect(serialized).not.toMatch(/Secure/i);
  });

  it("prefix secure forces Secure flag even when app secure is false", () => {
    const jar = createTaserCookieJar(null, undefined, { secure: false });
    jar.set("session", "abc", { prefix: "secure" });
    const response = jar.applyTo(new Response());
    const serialized = (
      response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")!]
    ).join("; ");
    expect(serialized).toMatch(/Secure/i);
    expect(serialized).toContain("__Secure-session=abc");
  });

  it("setSigned inherits serialize defaults", async () => {
    const jar = createTaserCookieJar(null, "secret");
    await jar.setSigned("session", "abc");
    const response = jar.applyTo(new Response());
    const serialized = (
      response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")!]
    ).join("; ");
    expect(serialized).toMatch(/HttpOnly/i);
    expect(serialized).toMatch(/Secure/i);
    expect(serialized).toMatch(/SameSite=Lax/i);
  });
});
