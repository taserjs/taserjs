import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  hasInputSchemas,
  validateSchema,
  ValidationError,
  validationErrorSchema,
  withAuto422,
} from "../src/index.js";

describe("validateSchema", () => {
  it("returns validated output", async () => {
    const schema = z.object({ name: z.string() });
    const result = await validateSchema(schema, { name: "test" });
    expect(result).toEqual({ name: "test" });
  });

  it("throws ValidationError on validation failure", async () => {
    const schema = z.object({ name: z.string() });
    await expect(validateSchema(schema, { name: 1 })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("hasInputSchemas", () => {
  it("detects route-level input schemas", () => {
    expect(hasInputSchemas({ query: z.string() })).toBe(true);
    expect(hasInputSchemas({})).toBe(false);
  });

  it("detects middleware input schemas in the chain", () => {
    expect(
      hasInputSchemas({
        middlewares: [{ params: z.object({ id: z.string() }) }],
      }),
    ).toBe(true);
    expect(
      hasInputSchemas({
        middlewares: [{ body: z.object({ name: z.string() }) }],
      }),
    ).toBe(true);
    expect(
      hasInputSchemas({
        middlewares: [
          { state: z.object({ role: z.string() }) } as {
            query?: unknown;
            params?: unknown;
            body?: unknown;
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("withAuto422", () => {
  it("injects validationErrorSchema when enabled", () => {
    const withInject = withAuto422({ 200: z.string() }, true);
    expect(withInject[422]).toBe(validationErrorSchema);
  });

  it("does not override an explicit 422", () => {
    const custom = z.object({ errors: z.array(z.string()) });
    const overridden = withAuto422({ 422: custom }, true);
    expect(overridden[422]).toBe(custom);
  });
});
