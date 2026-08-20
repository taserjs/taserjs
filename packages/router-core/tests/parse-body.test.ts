import { describe, expect, it } from "vitest";

import { isFormMediaType, isJsonMediaType, parseMediaType } from "../src/http/parse-body.js";

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
