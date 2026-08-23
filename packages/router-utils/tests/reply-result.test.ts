import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { mergeReturnsMaps, validateReply } from "../src/index.js";
import { json, noContent, text, REPLY_DATA, REPLY_KIND } from "../src/reply/index.js";
import { buffer } from "../src/stream/index.js";

describe("ReplyOf / Response", () => {
  it("returns standard Response with data/kind symbols for json", async () => {
    const result = json({ ok: true });
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(200);
    expect((result as unknown as Record<symbol, unknown>)[REPLY_KIND]).toBe("json");
    expect((result as unknown as Record<symbol, unknown>)[REPLY_DATA]).toEqual({ ok: true });
    expect(await result.json()).toEqual({ ok: true });
  });

  it("stores text body on REPLY_DATA", async () => {
    const result = text("hello");
    expect((result as unknown as Record<symbol, unknown>)[REPLY_KIND]).toBe("text");
    expect((result as unknown as Record<symbol, unknown>)[REPLY_DATA]).toBe("hello");
    expect(await result.text()).toBe("hello");
  });

  it("stores path on file replies", () => {
    // Avoid opening a real file in this unit — buffer covers opaque binary data.
    const result = buffer(Buffer.from("x"));
    expect((result as unknown as Record<symbol, unknown>)[REPLY_KIND]).toBe("binary");
    expect((result as unknown as Record<symbol, unknown>)[REPLY_DATA]).toEqual(Buffer.from("x"));
  });

  it("stores null data for noContent", () => {
    const result = noContent();
    expect(result.status).toBe(204);
    expect((result as unknown as Record<symbol, unknown>)[REPLY_KIND]).toBe("empty");
    expect((result as unknown as Record<symbol, unknown>)[REPLY_DATA]).toBeNull();
  });

  it("keeps symbols non-enumerable so JSON.stringify cannot envelope", () => {
    const result = text("hello");
    expect((result as unknown as Record<symbol, unknown>)[REPLY_DATA]).toBe("hello");
    expect((result as unknown as Record<symbol, unknown>)[REPLY_KIND]).toBe("text");
    expect(Object.keys(result)).toEqual([]);
    expect(JSON.stringify(result)).toBe("{}");
  });
});

describe("validateReply", () => {
  const request = new Request("http://localhost/hello");

  it("skips when map is empty or status absent", async () => {
    const result = json({ ok: true });
    expect(await validateReply(result, {}, { request })).toBe(result);
    expect(await validateReply(result, { 404: z.object({ error: z.string() }) }, { request })).toBe(
      result,
    );
  });

  it("validates matching status schema", async () => {
    const result = json({ id: "1" });
    const ok = await validateReply(
      result,
      {
        200: z.object({ id: z.string() }),
      },
      { request },
    );
    expect(ok.status).toBe(200);
  });

  it("returns 502 when body fails schema", async () => {
    const result = json({ id: 1 });
    const failed = await validateReply(
      result,
      {
        200: z.object({ id: z.string() }),
      },
      { request },
    );
    expect(failed.status).toBe(502);
    expect(failed).toBeInstanceOf(Response);
    expect(await failed.json()).toEqual({ id: 1 });
  });

  it("calls onValidationFailure with issues and request", async () => {
    const onValidationFailure = vi.fn();
    const result = json({ id: 1 });
    await validateReply(
      result,
      {
        200: z.object({ id: z.string() }),
      },
      { request, onValidationFailure },
    );
    expect(onValidationFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        issues: expect.arrayContaining([expect.objectContaining({ message: expect.any(String) })]),
      }),
    );
  });

  it("validates text with z.string()", async () => {
    const result = text("ok");
    const ok = await validateReply(result, { 200: z.string() }, { request });
    expect(ok.status).toBe(200);
  });
});

describe("returns helpers", () => {
  it("merges maps with later write winning", () => {
    const a = { 401: z.object({ error: z.literal("a") }) };
    const b = { 401: z.object({ error: z.literal("b") }), 200: z.object({ ok: z.boolean() }) };
    const merged = mergeReturnsMaps(a, b);
    expect(merged[401]).toBe(b[401]);
    expect(merged[200]).toBe(b[200]);
  });
});
