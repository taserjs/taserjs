import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { UnsupportedMediaTypeError } from "@taserjs/utils";
import { extractBody } from "../src/body.js";

describe("Body parser & media type enforcement", () => {
  it("extracts json body for application/json", async () => {
    const app = new Hono();
    let parsedBody: unknown;

    app.post("/test", async (c) => {
      parsedBody = await extractBody(c, "json");
      return c.text("ok");
    });

    const res = await app.request("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice" }),
    });

    expect(res.status).toBe(200);
    expect(parsedBody).toEqual({ name: "Alice" });
  });

  it("extracts json body for application/problem+json", async () => {
    const app = new Hono();
    let parsedBody: unknown;

    app.post("/test", async (c) => {
      parsedBody = await extractBody(c, "json");
      return c.text("ok");
    });

    const res = await app.request("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/problem+json; charset=utf-8" },
      body: JSON.stringify({ detail: "error" }),
    });

    expect(res.status).toBe(200);
    expect(parsedBody).toEqual({ detail: "error" });
  });

  it("throws UnsupportedMediaTypeError when Content-Type mismatches declared bodyMode json", async () => {
    const app = new Hono();
    let error: unknown;

    app.post("/test", async (c) => {
      try {
        await extractBody(c, "json");
      } catch (err) {
        error = err;
        throw err;
      }
      return c.text("ok");
    });

    await app.request("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not json",
    });

    expect(error).toBeInstanceOf(UnsupportedMediaTypeError);
    expect((error as UnsupportedMediaTypeError).status).toBe(415);
  });

  it("extracts form body via parseBody when mode is form", async () => {
    const app = new Hono();
    let parsedBody: unknown;

    app.post("/test", async (c) => {
      parsedBody = await extractBody(c, "form");
      return c.text("ok");
    });

    const formData = new FormData();
    formData.append("username", "bob");

    const res = await app.request("http://localhost/test", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(200);
    expect(parsedBody).toEqual({ username: "bob" });
  });

  it("extracts urlencoded body when mode is urlencoded", async () => {
    const app = new Hono();
    let parsedBody: unknown;

    app.post("/test", async (c) => {
      parsedBody = await extractBody(c, "urlencoded");
      return c.text("ok");
    });

    const res = await app.request("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "foo=bar&baz=qux",
    });

    expect(res.status).toBe(200);
    expect(parsedBody).toEqual({ foo: "bar", baz: "qux" });
  });

  it("throws UnsupportedMediaTypeError when mode is urlencoded but body is multipart", async () => {
    const app = new Hono();
    let error: unknown;

    app.post("/test", async (c) => {
      try {
        await extractBody(c, "urlencoded");
      } catch (err) {
        error = err;
        throw err;
      }
      return c.text("ok");
    });

    const formData = new FormData();
    formData.append("k", "v");

    await app.request("http://localhost/test", {
      method: "POST",
      body: formData,
    });

    expect(error).toBeInstanceOf(UnsupportedMediaTypeError);
    expect((error as UnsupportedMediaTypeError).status).toBe(415);
  });

  it("extracts text when mode is text", async () => {
    const app = new Hono();
    let parsedBody: unknown;

    app.post("/test", async (c) => {
      parsedBody = await extractBody(c, "text");
      return c.text("ok");
    });

    const res = await app.request("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello world",
    });

    expect(res.status).toBe(200);
    expect(parsedBody).toBe("hello world");
  });

  it("extracts raw Request when mode is raw", async () => {
    const app = new Hono();
    let parsedBody: unknown;

    app.post("/test", async (c) => {
      parsedBody = await extractBody(c, "raw");
      return c.text("ok");
    });

    const res = await app.request("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: "binary data",
    });

    expect(res.status).toBe(200);
    expect(parsedBody).toBeInstanceOf(Request);
  });

  it("returns undefined for GET and HEAD requests", async () => {
    const app = new Hono();
    let parsedBody: unknown = "not-called";

    app.get("/test", async (c) => {
      parsedBody = await extractBody(c, "json");
      return c.text("ok");
    });

    await app.request("http://localhost/test", { method: "GET" });
    expect(parsedBody).toBeUndefined();
  });
});
