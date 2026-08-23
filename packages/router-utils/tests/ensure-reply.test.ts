import { describe, expect, it } from "vitest";

import { ensureResponse, json, REPLY_DATA } from "../src/reply/index.js";

describe("ensureResponse", () => {
  it("passes through Response", () => {
    const result = json({ ok: true });
    expect(ensureResponse(result)).toBe(result);
  });

  it("coerces nullish to noContent", () => {
    const result = ensureResponse(undefined);
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(204);
  });

  it("coerces plain objects to json", async () => {
    const result = ensureResponse({ a: 1 });
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(200);
    expect((result as unknown as Record<symbol, unknown>)[REPLY_DATA]).toEqual({ a: 1 });
  });

  it("passes through bare Response", () => {
    const bare = new Response("hi", { status: 201 });
    const result = ensureResponse(bare);
    expect(result).toBeInstanceOf(Response);
    expect(result).toBe(bare);
    expect(result.status).toBe(201);
  });
});
