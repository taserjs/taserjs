import { describe, expect, it } from "vitest";

import {
  isFormMediaType,
  isJsonMediaType,
  parseMediaType,
  parseRequestBody,
} from "../src/http/parse-body.js";

describe("parseMediaType", () => {
  it("parses media type without parameters", () => {
    expect(parseMediaType("application/json")).toEqual({ type: "application", subtype: "json" });
    expect(parseMediaType("application/json; charset=utf-8")).toEqual({
      type: "application",
      subtype: "json",
    });
  });

  it("rejects invalid media types", () => {
    expect(parseMediaType("")).toBeNull();
  });
});

describe("isJsonMediaType", () => {
  it("accepts json and problem+json", () => {
    expect(isJsonMediaType("application", "json")).toBe(true);
    expect(isJsonMediaType("application", "problem+json")).toBe(true);
    expect(isJsonMediaType("application", "x-www-form-urlencoded")).toBe(false);
  });
});

describe("isFormMediaType", () => {
  it("accepts multipart and urlencoded", () => {
    expect(isFormMediaType("multipart", "form-data")).toBe(true);
    expect(isFormMediaType("application", "x-www-form-urlencoded")).toBe(true);
    expect(isFormMediaType("application", "json")).toBe(false);
  });
});

describe("parseRequestBody with bodyMode", () => {
  it("parses json when mode is json", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    const parsed = await parseRequestBody(req, "json");
    expect(parsed).toEqual({ hello: "world" });
  });

  it("throws 415 when json mode receives non-json", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "plain text",
    });
    await expect(parseRequestBody(req, "json")).rejects.toMatchObject({
      status: 415,
    });
  });

  it("parses form when mode is form", async () => {
    const formData = new FormData();
    formData.append("name", "test");
    const req = new Request("http://localhost/test", {
      method: "POST",
      body: formData,
    });
    const parsed = await parseRequestBody(req, "form");
    expect(parsed).toEqual({ name: "test" });
  });

  it("throws 415 when form mode receives application/json", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    await expect(parseRequestBody(req, "form")).rejects.toMatchObject({
      status: 415,
    });
  });
});
