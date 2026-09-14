import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import {
  UnsupportedMediaTypeError,
  ValidationError,
  unsupportedMediaType,
  validateStandardSchema,
} from "../src/index.js";

describe("ValidationError & Standard Schema validation primitives", () => {
  it("creates a ValidationError with issues and target facet", () => {
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

  it("validates and returns transformed value for synchronous Standard Schema", async () => {
    const syncSchema: StandardSchemaV1<string, number> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate(value: unknown) {
          const num = Number(value);
          if (isNaN(num)) {
            return { issues: [{ message: "Expected valid number" }] };
          }
          return { value: num };
        },
      },
    };

    const result = await validateStandardSchema(syncSchema, "42", "params");
    expect(result).toBe(42);
  });

  it("validates and returns transformed value for async Standard Schema", async () => {
    const asyncSchema: StandardSchemaV1<string, string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        async validate(value: unknown) {
          await new Promise((r) => setTimeout(r, 1));
          if (typeof value !== "string") {
            return { issues: [{ message: "Expected string" }] };
          }
          return { value: value.trim() };
        },
      },
    };

    const result = await validateStandardSchema(asyncSchema, "  hello  ", "query");
    expect(result).toBe("hello");
  });

  it("throws ValidationError when Standard Schema validation fails", async () => {
    const schema: StandardSchemaV1<unknown, string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate(value: unknown) {
          if (typeof value !== "string") {
            return { issues: [{ message: "Expected string", path: ["name"] }] };
          }
          return { value };
        },
      },
    };

    await expect(validateStandardSchema(schema, 123, "body")).rejects.toThrow(ValidationError);

    try {
      await validateStandardSchema(schema, 123, "body");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const valErr = err as ValidationError;
      expect(valErr.facet).toBe("body");
      expect(valErr.issues).toHaveLength(1);
      expect(valErr.issues[0]?.message).toBe("Expected string");
      expect(valErr.issues[0]?.path).toEqual(["name"]);
    }
  });

  it("creates a 415 unsupportedMediaType Response helper", async () => {
    const res = unsupportedMediaType({ message: "Unsupported Media Type" });
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(415);
    const data = await res.json();
    expect(data).toEqual({ message: "Unsupported Media Type" });
  });

  it("creates an UnsupportedMediaTypeError with 415 status", () => {
    const err = new UnsupportedMediaTypeError("Expected application/json");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("UnsupportedMediaTypeError");
    expect(err.status).toBe(415);
    expect(err.message).toBe("Expected application/json");
  });
});
