import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { InferInput, InferOutput, Schema } from "../src/types/schema.js";
import type { AssertTrue, ExpectEqual } from "./helpers.js";

describe("Standard Schema types", () => {
  it("accepts Zod schemas as Schema", () => {
    const querySchema = z.object({ page: z.number() });
    const _schema: Schema<{ page: number }> = querySchema;
    expect(_schema).toBe(querySchema);
  });

  it("infers output types from Zod schemas", () => {
    const schema = z.object({ name: z.string(), age: z.number() });

    type Output = InferOutput<typeof schema>;
    const _check: AssertTrue<ExpectEqual<Output, { name: string; age: number }>> = true;
    void _check;
    expect(schema.parse({ name: "test", age: 1 })).toEqual({ name: "test", age: 1 });
  });

  it("infers input types from Zod schemas", () => {
    const schema = z.object({ enabled: z.boolean() });

    type Input = InferInput<typeof schema>;
    const _check: AssertTrue<ExpectEqual<Input, { enabled: boolean }>> = true;
    void _check;
    expect(schema.parse({ enabled: true })).toEqual({ enabled: true });
  });
});
