import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { reply } from "../src/index.js";

describe("reply", () => {
  it("builds json responses", async () => {
    const response = reply.json({ ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("returns notFound response with default json body", async () => {
    const response = reply.notFound();
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ error: "Not Found" });
  });

  it("returns badRequest with string body as plain text", async () => {
    const response = reply.badRequest("teamId is required");
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe("teamId is required");
  });

  it("returns unprocessableEntity with json errors payload", async () => {
    const issues = [{ message: "Invalid input", path: ["name"] }];
    const response = reply.unprocessableEntity({ errors: issues });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ errors: issues });
  });

  it("respects custom headers via init on error helpers", () => {
    const response = reply.notFound(undefined, {
      headers: { "x-request-id": "abc" },
    });
    expect(response.headers.get("x-request-id")).toBe("abc");
  });

  it("builds buffer responses", async () => {
    const data = Buffer.from("hello");
    const response = reply.buffer(data);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(data);
  });

  it("builds blob responses", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const response = reply.blob(blob);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("hello");
  });

  it("builds stream responses from web streams", async () => {
    const response = reply.stream(
      Readable.toWeb(
        Readable.from([Buffer.from("chunk-a"), Buffer.from("chunk-b")]),
      ) as ReadableStream,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("chunk-achunk-b");
  });

  it("builds stream responses from node streams", async () => {
    const response = reply.stream(Readable.from([Buffer.from("node-stream")]));
    expect(await response.text()).toBe("node-stream");
  });

  it("streams file contents", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taser-reply-"));
    const path = join(dir, "sample.txt");
    await writeFile(path, "file-body");

    const response = reply.file(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("file-body");
  });

  it("rejects path traversal in reply.file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taser-reply-traversal-"));
    expect(() => reply.file("../../etc/passwd")).toThrow("Invalid file path");
    expect(() => reply.file("..", { root: dir })).toThrow("Invalid file path");
    expect(() => reply.file("nested.txt")).toThrow("requires init.root");
  });

  it("allows files under root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taser-reply-root-"));
    const path = join(dir, "safe.txt");
    await writeFile(path, "safe");

    const response = reply.file("safe.txt", { root: dir });
    expect(await response.text()).toBe("safe");
  });

  it("rejects external redirect locations by default", () => {
    expect(() => reply.redirect("https://evil.com")).toThrow("External redirect");
    expect(() => reply.redirect("//evil.com")).toThrow();
  });

  it("allows safe relative redirects", () => {
    const response = reply.redirect("/dashboard");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/dashboard");
  });

  it("rejects CRLF in redirect locations", () => {
    expect(() => reply.redirect("/ok\r\nSet-Cookie: x")).toThrow("Invalid redirect location");
  });

  it("allows external redirects when allowExternal is true", () => {
    const response = reply.redirect("https://example.com", { allowExternal: true });
    expect(response.headers.get("location")).toBe("https://example.com");
  });

  describe("reply.ok body classification", () => {
    it("handles undefined as empty body", async () => {
      const response = reply.ok();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("");
    });

    it("handles plain objects as json", async () => {
      const response = reply.ok({ ok: true });
      expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(await response.json()).toEqual({ ok: true });
    });

    it("handles strings as text", async () => {
      const response = reply.ok("hello");
      expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await response.text()).toBe("hello");
    });

    it("handles Buffer as bytes", async () => {
      const data = Buffer.from("bytes");
      const response = reply.ok(data);
      expect(response.headers.get("content-type")).toBe("application/octet-stream");
      expect(Buffer.from(await response.arrayBuffer())).toEqual(data);
    });

    it("handles Blob as blob", async () => {
      const blob = new Blob(["blob"], { type: "text/plain" });
      const response = reply.ok(blob);
      expect(response.headers.get("content-type")).toBe("text/plain");
      expect(await response.text()).toBe("blob");
    });

    it("handles ReadableStream as stream", async () => {
      const response = reply.ok(Readable.from([Buffer.from("stream-ok")]));
      expect(await response.text()).toBe("stream-ok");
    });

    it("handles FormData", async () => {
      const form = new FormData();
      form.set("name", "test");
      const response = reply.ok(form);
      expect(await response.formData()).toEqual(form);
    });

    it("handles URLSearchParams", async () => {
      const params = new URLSearchParams({ q: "test" });
      const response = reply.ok(params);
      expect(response.headers.get("content-type")).toBe(
        "application/x-www-form-urlencoded;charset=UTF-8",
      );
      expect(await response.text()).toBe("q=test");
    });
  });
});
