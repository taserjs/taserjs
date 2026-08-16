import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { RequestShape } from "./type-utils.js";

export type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * A Standard Schema validator.
 * `TOutput` is the validated/output type; `TInput` is the pre-parse input (request shape).
 */
export type Schema<TOutput = unknown, TInput = unknown> = StandardSchemaV1<TInput, TOutput>;

/** Infers the output type from a Standard Schema. */
export type InferOutput<S> = S extends StandardSchemaV1<unknown, infer O> ? O : never;

/** Infers the input type from a Standard Schema. */
export type InferInput<S> = S extends StandardSchemaV1<infer I, unknown> ? I : never;

/** Pre-parse request shape from a Standard Schema. */
export type SchemaRequestShape<S> =
  S extends StandardSchemaV1<infer I, infer O> ? RequestShape<I, O> : S;
