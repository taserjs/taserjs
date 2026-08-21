import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { SchemaTransformer } from "../types.js";

export type SchemaResolveOptions = {
  target?: "draft-2020-12" | "draft-07" | "openapi-3.0";
  transformSchema?: SchemaTransformer;
};

export type StandardJSONSchemaV1<Input = unknown, Output = Input> = StandardSchemaV1<
  Input,
  Output
> & {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: StandardSchemaV1<Input, Output>["~standard"]["validate"];
    readonly jsonSchema?: {
      readonly input?: (options: { target: string }) => Record<string, unknown>;
      readonly output?: (options: { target: string }) => Record<string, unknown>;
    };
  };
};
