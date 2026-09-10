import { describe, expect, it } from "vitest";
import {
  badRequest,
  conflict,
  forbidden,
  html,
  internalServerError,
  json,
  methodNotAllowed,
  notFound,
  redirect,
  text,
  unauthorized,
  unprocessable,
} from "../src/reply.js";

describe("@taserjs/router/reply helpers", () => {
  it("creates json response with default 200", async () => {
    const res = json({ hello: "world" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("creates json response with custom init", async () => {
    const res = json({ created: true }, { status: 201, headers: { "X-Test": "1" } });
    expect(res.status).toBe(201);
    expect(res.headers.get("X-Test")).toBe("1");
    expect(await res.json()).toEqual({ created: true });
  });

  it("creates text response", async () => {
    const res = text("plain text");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("plain text");
  });

  it("creates html response", async () => {
    const res = html("<h1>Hello</h1>");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toBe("<h1>Hello</h1>");
  });

  it("creates redirect response", () => {
    const res = redirect("/login");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");

    const perm = redirect("/home", { status: 301 });
    expect(perm.status).toBe(301);
    expect(perm.headers.get("location")).toBe("/home");
  });

  it("creates 4xx and 5xx error responses", async () => {
    const err400 = badRequest({ error: "bad" });
    expect(err400.status).toBe(400);
    expect(await err400.json()).toEqual({ error: "bad" });

    const err401 = unauthorized();
    expect(err401.status).toBe(401);
    expect(await err401.json()).toEqual({ message: "HTTP 401" });

    const err403 = forbidden();
    expect(err403.status).toBe(403);

    const err404 = notFound({ message: "Item not found" });
    expect(err404.status).toBe(404);
    expect(await err404.json()).toEqual({ message: "Item not found" });

    const err405 = methodNotAllowed();
    expect(err405.status).toBe(405);

    const err409 = conflict();
    expect(err409.status).toBe(409);

    const err422 = unprocessable({ field: "email" });
    expect(err422.status).toBe(422);

    const err500 = internalServerError();
    expect(err500.status).toBe(500);
  });
});
