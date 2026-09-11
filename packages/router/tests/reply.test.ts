import { describe, expect, it } from "vitest";
import {
  accepted,
  badRequest,
  conflict,
  created,
  createTypedResponse,
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

describe("@taserjs/router/reply re-exports", () => {
  it("re-exports all reply helpers from @taserjs/utils", () => {
    expect(typeof json).toBe("function");
    expect(typeof ok).toBe("function");
    expect(typeof created).toBe("function");
    expect(typeof accepted).toBe("function");
    expect(typeof noContent).toBe("function");
    expect(typeof text).toBe("function");
    expect(typeof html).toBe("function");
    expect(typeof redirect).toBe("function");
    expect(typeof badRequest).toBe("function");
    expect(typeof unauthorized).toBe("function");
    expect(typeof forbidden).toBe("function");
    expect(typeof notFound).toBe("function");
    expect(typeof methodNotAllowed).toBe("function");
    expect(typeof conflict).toBe("function");
    expect(typeof payloadTooLarge).toBe("function");
    expect(typeof unprocessable).toBe("function");
    expect(typeof tooManyRequests).toBe("function");
    expect(typeof internalServerError).toBe("function");
    expect(typeof createTypedResponse).toBe("function");
  });

  it("produces correct responses via @taserjs/router/reply", async () => {
    const okEmpty = ok();
    expect(okEmpty.status).toBe(200);
    expect(okEmpty.body).toBeNull();
    expect(okEmpty.headers.get("content-type")).toBeNull();

    const okRes = ok({ user: "bob" });
    expect(okRes.status).toBe(200);
    expect(okRes._data).toEqual({ user: "bob" });
    expect(okRes.headers.get("content-type")).toContain("application/json");

    const okString = ok("raw message");
    expect(okString.status).toBe(200);
    expect(okString.headers.get("content-type")).toContain("text/plain");
    expect(await okString.text()).toBe("raw message");

    const createdRes = created({ id: "abc" });
    expect(createdRes.status).toBe(201);
    expect(createdRes._data).toEqual({ id: "abc" });
    expect(createdRes.headers.get("content-type")).toContain("application/json");

    const acceptedRes = accepted({ queued: true });
    expect(acceptedRes.status).toBe(202);
    expect(acceptedRes._data).toEqual({ queued: true });
    expect(acceptedRes.headers.get("content-type")).toContain("application/json");

    const noContentRes = noContent({ headers: { "X-Reason": "cleared" } });
    expect(noContentRes.status).toBe(204);
    expect(noContentRes.body).toBeNull();
    expect(noContentRes.headers.get("X-Reason")).toBe("cleared");

    const payloadTooLargeRes = payloadTooLarge({ error: "Too large" });
    expect(payloadTooLargeRes.status).toBe(413);
    expect(payloadTooLargeRes._data).toEqual({ error: "Too large" });
    expect(payloadTooLargeRes.headers.get("content-type")).toContain("application/json");

    const tooManyRes = tooManyRequests();
    expect(tooManyRes.status).toBe(429);
    expect(tooManyRes._data).toBeUndefined();
    expect(tooManyRes.body).toBeNull();
    expect(tooManyRes.headers.get("content-type")).toBeNull();
  });
});
