import { describe, expect, it } from "vitest";

import {
  accepted,
  badGateway,
  badRequest,
  conflict,
  created,
  forbidden,
  gatewayTimeout,
  html,
  internalServerError,
  json,
  noContent,
  notFound,
  notImplemented,
  ok,
  payloadTooLarge,
  redirect,
  serviceUnavailable,
  text,
  tooManyRequests,
  unauthorized,
  unprocessableEntity,
  unsupportedMediaType,
} from "../src/reply/index.js";

describe("standalone reply functions", () => {
  it("builds json responses", async () => {
    const response = json({ ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("returns notFound response with default json body", async () => {
    const response = notFound();
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ error: "Not Found" });
  });

  it("returns badRequest with string body as plain text", async () => {
    const response = badRequest("teamId is required");
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe("teamId is required");
  });

  it("returns unprocessableEntity with json errors payload", async () => {
    const issues = [{ message: "Invalid input", path: ["name"] }];
    const response = unprocessableEntity({ errors: issues });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ errors: issues });
  });

  it("respects custom headers via init on error helpers", () => {
    const response = notFound(undefined, {
      headers: { "x-request-id": "abc" },
    });
    expect(response.headers.get("x-request-id")).toBe("abc");
  });

  it("rejects external redirect locations by default", () => {
    expect(() => redirect("https://evil.com")).toThrow("External redirect");
    expect(() => redirect("//evil.com")).toThrow();
  });

  it("allows safe relative redirects", () => {
    const response = redirect("/dashboard");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/dashboard");
  });

  it("rejects CRLF in redirect locations", () => {
    expect(() => redirect("/ok\r\nSet-Cookie: x")).toThrow("Invalid redirect location");
  });

  it("allows external redirects when allowExternal is true", () => {
    const response = redirect("https://example.com", { allowExternal: true });
    expect(response.headers.get("location")).toBe("https://example.com");
  });

  describe("ok body classification", () => {
    it("handles undefined as empty body", async () => {
      const response = ok();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("");
    });

    it("handles plain objects as json", async () => {
      const response = ok({ ok: true });
      expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(await response.json()).toEqual({ ok: true });
    });

    it("handles strings as text", async () => {
      const response = ok("hello");
      expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await response.text()).toBe("hello");
    });

    it("handles Buffer as bytes", async () => {
      const data = Buffer.from("bytes");
      const response = ok(data);
      expect(response.headers.get("content-type")).toBe("application/octet-stream");
      expect(Buffer.from(await response.arrayBuffer())).toEqual(data);
    });

    it("handles Blob as blob", async () => {
      const blob = new Blob(["blob"], { type: "text/plain" });
      const response = ok(blob);
      expect(response.headers.get("content-type")).toBe("text/plain");
      expect(await response.text()).toBe("blob");
    });

    it("handles FormData", async () => {
      const form = new FormData();
      form.set("name", "test");
      const response = ok(form);
      expect(await response.formData()).toEqual(form);
    });

    it("handles URLSearchParams", async () => {
      const params = new URLSearchParams({ q: "test" });
      const response = ok(params);
      expect(response.headers.get("content-type")).toBe(
        "application/x-www-form-urlencoded;charset=UTF-8",
      );
      expect(await response.text()).toBe("q=test");
    });
  });

  describe("success helpers", () => {
    it("builds created responses with 201 status", async () => {
      const response = created({ id: "user_123" });
      expect(response.status).toBe(201);
      expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(await response.json()).toEqual({ id: "user_123" });
    });

    it("builds accepted responses with 202 status", async () => {
      const response = accepted({ jobId: "job_999" });
      expect(response.status).toBe(202);
      expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(await response.json()).toEqual({ jobId: "job_999" });
    });

    it("builds text responses with 200 status", async () => {
      const response = text("hello");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await response.text()).toBe("hello");
    });

    it("builds html responses with 200 status and html content-type", async () => {
      const markup = "<h1>Hello World</h1>";
      const response = html(markup);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await response.text()).toBe(markup);
    });

    it("supports custom status and headers in html", async () => {
      const markup = "<h1>Custom Status</h1>";
      const response = html(markup, {
        status: 201,
        headers: { "x-custom": "true" },
      });
      expect(response.status).toBe(201);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(response.headers.get("x-custom")).toBe("true");
      expect(await response.text()).toBe(markup);
    });

    it("builds noContent responses with 204 status", async () => {
      const response = noContent();
      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
    });
  });

  describe("error helpers", () => {
    it("returns unauthorized (401)", async () => {
      const response = unauthorized();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns forbidden (403)", async () => {
      const response = forbidden();
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Forbidden" });
    });

    it("returns conflict (409) with default error message", async () => {
      const response = conflict();
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "Conflict" });
    });

    it("returns payloadTooLarge (413) with custom body", async () => {
      const response = payloadTooLarge({ message: "File exceeds 5MB limit" });
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ message: "File exceeds 5MB limit" });
    });

    it("returns unsupportedMediaType (415) with default error message", async () => {
      const response = unsupportedMediaType();
      expect(response.status).toBe(415);
      expect(await response.json()).toEqual({ error: "Unsupported Media Type" });
    });

    it("returns tooManyRequests (429) with retry-after header and payload", async () => {
      const response = tooManyRequests(
        { error: "Rate limit exceeded", retryAfter: 60 },
        { headers: { "Retry-After": "60" } },
      );
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("60");
      expect(await response.json()).toEqual({ error: "Rate limit exceeded", retryAfter: 60 });
    });

    it("returns internalServerError (500)", async () => {
      const response = internalServerError();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal Server Error" });
    });

    it("returns notImplemented (501) with default error message", async () => {
      const response = notImplemented();
      expect(response.status).toBe(501);
      expect(await response.json()).toEqual({ error: "Not Implemented" });
    });

    it("returns badGateway (502) with default error message", async () => {
      const response = badGateway();
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "Bad Gateway" });
    });

    it("returns serviceUnavailable (503) with default error message", async () => {
      const response = serviceUnavailable();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "Service Unavailable" });
    });

    it("returns gatewayTimeout (504) with default error message", async () => {
      const response = gatewayTimeout();
      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({ error: "Gateway Timeout" });
    });
  });
});
