import { describe, expect, it } from "vitest";
import {
  accepted,
  badRequest,
  conflict,
  created,
  forbidden,
  html,
  internalServerError,
  json,
  methodNotAllowed,
  noContent,
  notFound,
  ok,
  payloadTooLarge,
  redirect,
  text,
  tooManyRequests,
  unauthorized,
  unprocessable,
} from "../src/reply.js";

describe("@taserjs/utils reply helpers", () => {
  it("creates json response with default 200", async () => {
    const res = json({ hello: "world" });
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ hello: "world" });
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("creates json response with custom ResponseInit", async () => {
    const res = json({ created: true }, { status: 201, headers: { "X-Test": "1" } });
    expect(res.status).toBe(201);
    expect(res._status).toBe(201);
    expect(res._data).toEqual({ created: true });
    expect(res.headers.get("X-Test")).toBe("1");
    expect(await res.json()).toEqual({ created: true });
  });

  it("creates ok response with no default headers when empty or string", async () => {
    const resEmpty = ok();
    expect(resEmpty.status).toBe(200);
    expect(resEmpty._status).toBe(200);
    expect(resEmpty._data).toBeUndefined();
    expect(resEmpty.body).toBeNull();
    expect(resEmpty.headers.get("content-type")).toBeNull();

    const resString = ok("raw text payload");
    expect(resString.status).toBe(200);
    expect(resString._status).toBe(200);
    expect(resString._data).toBe("raw text payload");
    expect(resString.headers.get("content-type")).toContain("text/plain");
    expect(await resString.text()).toBe("raw text payload");

    const resObj = ok({ user: "alice" });
    expect(resObj.status).toBe(200);
    expect(resObj._status).toBe(200);
    expect(resObj._data).toEqual({ user: "alice" });
    expect(resObj.headers.get("content-type")).toContain("application/json");
    expect(await resObj.json()).toEqual({ user: "alice" });

    const resArray = ok([1, 2, 3]);
    expect(resArray.headers.get("content-type")).toContain("application/json");
    expect(await resArray.json()).toEqual([1, 2, 3]);

    const resBinary = ok(new Uint8Array([1, 2, 3]));
    expect(resBinary.headers.get("content-type")).toBeNull();
  });

  it("creates created response defaulting to 201 with headers and auto-detection", async () => {
    const res = created({ id: "123" });
    expect(res.status).toBe(201);
    expect(res._status).toBe(201);
    expect(res._data).toEqual({ id: "123" });
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ id: "123" });

    const resEmpty = created();
    expect(resEmpty.status).toBe(201);
    expect(resEmpty.body).toBeNull();
    expect(resEmpty.headers.get("content-type")).toBeNull();

    const withHeaders = created({ id: "456" }, { headers: { "X-Custom": "custom-value" } });
    expect(withHeaders.headers.get("X-Custom")).toBe("custom-value");
    expect(withHeaders.headers.get("content-type")).toContain("application/json");
  });

  it("creates accepted response defaulting to 202 with headers and auto-detection", async () => {
    const resWithData = accepted({ status: "processing" });
    expect(resWithData.status).toBe(202);
    expect(resWithData._status).toBe(202);
    expect(resWithData._data).toEqual({ status: "processing" });
    expect(resWithData.headers.get("content-type")).toContain("application/json");
    expect(await resWithData.json()).toEqual({ status: "processing" });

    const resEmpty = accepted();
    expect(resEmpty.status).toBe(202);
    expect(resEmpty._status).toBe(202);
    expect(resEmpty._data).toBeUndefined();
    expect(resEmpty.body).toBeNull();
    expect(resEmpty.headers.get("content-type")).toBeNull();

    const withHeaders = accepted(null, { headers: { "X-Task-Id": "task-99" } });
    expect(withHeaders.headers.get("X-Task-Id")).toBe("task-99");
    expect(withHeaders.headers.get("content-type")).toBeNull();
  });

  it("creates noContent response defaulting to 204 with null body and custom headers", () => {
    const res = noContent();
    expect(res.status).toBe(204);
    expect(res._status).toBe(204);
    expect(res._data).toBeNull();
    expect(res.body).toBeNull();
    expect(res.headers.get("content-type")).toBeNull();

    const withHeaders = noContent({ headers: { "X-Deleted": "true" } });
    expect(withHeaders.status).toBe(204);
    expect(withHeaders._status).toBe(204);
    expect(withHeaders.headers.get("X-Deleted")).toBe("true");
    expect(withHeaders.body).toBeNull();
    expect(withHeaders.headers.get("content-type")).toBeNull();
  });

  it("creates text response", async () => {
    const res = text("plain text");
    expect(res.status).toBe(200);
    expect(res._status).toBe(200);
    expect(res._data).toBe("plain text");
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("plain text");
  });

  it("creates html response", async () => {
    const res = html("<h1>Hello</h1>");
    expect(res.status).toBe(200);
    expect(res._status).toBe(200);
    expect(res._data).toBe("<h1>Hello</h1>");
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toBe("<h1>Hello</h1>");
  });

  it("creates redirect response", () => {
    const res = redirect("/login");
    expect(res.status).toBe(302);
    expect(res._status).toBe(302);
    expect(res._data).toBeNull();
    expect(res.headers.get("location")).toBe("/login");

    const perm = redirect("/home", { status: 301 });
    expect(perm.status).toBe(301);
    expect(perm._status).toBe(301);
    expect(perm.headers.get("location")).toBe("/home");
  });

  it("creates 4xx and 5xx error responses including payloadTooLarge and tooManyRequests", async () => {
    const err400 = badRequest({ error: "bad" });
    expect(err400.status).toBe(400);
    expect(err400._status).toBe(400);
    expect(err400._data).toEqual({ error: "bad" });
    expect(await err400.json()).toEqual({ error: "bad" });

    const err401 = unauthorized();
    expect(err401.status).toBe(401);
    expect(err401._status).toBe(401);
    expect(err401._data).toBeUndefined();
    expect(err401.body).toBeNull();
    expect(err401.headers.get("content-type")).toBeNull();

    const err403 = forbidden();
    expect(err403.status).toBe(403);
    expect(err403._status).toBe(403);
    expect(err403._data).toBeUndefined();
    expect(err403.body).toBeNull();
    expect(err403.headers.get("content-type")).toBeNull();

    const err404 = notFound({ message: "Item not found" });
    expect(err404.status).toBe(404);
    expect(err404._status).toBe(404);
    expect(err404._data).toEqual({ message: "Item not found" });
    expect(await err404.json()).toEqual({ message: "Item not found" });

    const err405 = methodNotAllowed();
    expect(err405.status).toBe(405);
    expect(err405._status).toBe(405);
    expect(err405.headers.get("content-type")).toBeNull();

    const err409 = conflict();
    expect(err409.status).toBe(409);
    expect(err409._status).toBe(409);
    expect(err409.headers.get("content-type")).toBeNull();

    const err413 = payloadTooLarge({ error: "File exceeds 10MB" });
    expect(err413.status).toBe(413);
    expect(err413._status).toBe(413);
    expect(err413._data).toEqual({ error: "File exceeds 10MB" });
    expect(err413.headers.get("content-type")).toContain("application/json");
    expect(await err413.json()).toEqual({ error: "File exceeds 10MB" });

    const err413WithHeaders = payloadTooLarge(undefined, { headers: { "Retry-After": "60" } });
    expect(err413WithHeaders.status).toBe(413);
    expect(err413WithHeaders.headers.get("Retry-After")).toBe("60");
    expect(err413WithHeaders.headers.get("content-type")).toBeNull();

    const err413Default = payloadTooLarge();
    expect(err413Default.status).toBe(413);
    expect(err413Default._status).toBe(413);
    expect(err413Default._data).toBeUndefined();
    expect(err413Default.headers.get("content-type")).toBeNull();

    const err422 = unprocessable({ field: "email" });
    expect(err422.status).toBe(422);
    expect(err422._status).toBe(422);
    expect(err422.headers.get("content-type")).toContain("application/json");

    const err429 = tooManyRequests({ error: "Rate limit exceeded" });
    expect(err429.status).toBe(429);
    expect(err429._status).toBe(429);
    expect(err429._data).toEqual({ error: "Rate limit exceeded" });
    expect(err429.headers.get("content-type")).toContain("application/json");
    expect(await err429.json()).toEqual({ error: "Rate limit exceeded" });

    const err429WithHeaders = tooManyRequests(undefined, { headers: { "Retry-After": "120" } });
    expect(err429WithHeaders.status).toBe(429);
    expect(err429WithHeaders.headers.get("Retry-After")).toBe("120");
    expect(err429WithHeaders.headers.get("content-type")).toBeNull();

    const err429Default = tooManyRequests();
    expect(err429Default.status).toBe(429);
    expect(err429Default._status).toBe(429);
    expect(err429Default._data).toBeUndefined();
    expect(err429Default.headers.get("content-type")).toBeNull();

    const err500 = internalServerError();
    expect(err500.status).toBe(500);
    expect(err500._status).toBe(500);
    expect(err500.headers.get("content-type")).toBeNull();
  });
});
