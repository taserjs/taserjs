import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";

import {
  ResponseValidationError,
  UnsupportedMediaTypeError,
  ValidationError,
  validateResponseSchema,
} from "../src/index.js";
import { unsupportedMediaType } from "../src/media.js";

const stringSchema = (
  validate: (
    value: unknown,
  ) => StandardSchemaV1.Result<string> | Promise<StandardSchemaV1.Result<string>>,
): StandardSchemaV1<unknown, string> => ({ "~standard": { version: 1, vendor: "test", validate } });

const trimmedString = (value: unknown): StandardSchemaV1.Result<string> =>
  typeof value === "string"
    ? { value: value.trim() }
    : { issues: [{ message: "Expected string", path: ["name"] }] };

describe("validation errors and response validation", () => {
  it("ValidationError carries issues and the failing facet", () => {
    const issues: StandardSchemaV1.Issue[] = [
      { message: "Expected string, received number", path: ["email"] },
    ];
    const error = new ValidationError(issues, "body");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ValidationError");
    expect(error.facet).toBe("body");
    expect(error.issues).toBe(issues);
    expect(error.message).toContain("body");
  });

  it("validated errors skip stack capture", () => {
    expect(new ValidationError([], "query").stack).toBe(
      "ValidationError: Validation failed for query",
    );
    expect(new UnsupportedMediaTypeError().stack?.split("\n")).toHaveLength(1);
  });

  it.each([
    ["sync", stringSchema(trimmedString)],
    ["async", stringSchema(async (value) => trimmedString(value))],
  ])("returns the transformed value for a %s schema", async (_kind, schema) => {
    expect(await validateResponseSchema(schema, "  hello  ", 200)).toBe("hello");
  });

  it("throws ResponseValidationError synchronously for a failing sync schema", () => {
    const schema = stringSchema(trimmedString);

    expect(() => validateResponseSchema(schema, 123, 201)).toThrow(ResponseValidationError);
    try {
      validateResponseSchema(schema, 123, 201);
    } catch (error) {
      const failure = error as ResponseValidationError;
      expect(failure.status).toBe(201);
      expect(failure.data).toBe(123);
      expect(failure.issues[0]?.path).toEqual(["name"]);
    }
  });

  it("rejects with ResponseValidationError for a failing async schema", async () => {
    const schema = stringSchema(async (value) => trimmedString(value));

    await expect(validateResponseSchema(schema, 123, 200)).rejects.toThrow(ResponseValidationError);
  });

  it("unsupportedMediaType builds a 415 response", async () => {
    const res = unsupportedMediaType({ message: "Unsupported Media Type" });

    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ message: "Unsupported Media Type" });
  });

  it("UnsupportedMediaTypeError exposes status and a lazily built 415 response", async () => {
    const err = new UnsupportedMediaTypeError("Expected application/json");

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("UnsupportedMediaTypeError");
    expect(err.status).toBe(415);
    expect(err.message).toBe("Expected application/json");
    expect(err.response.status).toBe(415);
    expect(await err.response.json()).toEqual({ message: "Expected application/json" });
  });
});
