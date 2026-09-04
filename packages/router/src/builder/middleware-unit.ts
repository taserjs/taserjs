import type { BodyMode } from "@taserjs/router-core";

import type { ReturnsMap } from "../types/returns.js";
import type { Schema } from "../types/schema.js";
import { pickDefinedSchemas, type SchemaValidators } from "../define/validators.js";

class MiddlewareUnitBuilderImpl {
  private readonly validators: SchemaValidators = {};
  private bodyMode: BodyMode | undefined;
  private returnsMap: ReturnsMap | undefined;
  readonly __requiredLayouts: string | readonly string[] | undefined;
  readonly __middlewareAcc: unknown = undefined;

  constructor(requiredLayouts?: string | readonly string[]) {
    this.__requiredLayouts = requiredLayouts;
  }

  query(schema: Schema<unknown>): this {
    this.validators.query = schema;
    return this;
  }

  params(schema: Schema<unknown>): this {
    this.validators.params = schema;
    return this;
  }

  body(modeOrSchema: BodyMode | Schema<unknown>, schema?: Schema<unknown>): this {
    if (typeof modeOrSchema === "string") {
      this.bodyMode = modeOrSchema as BodyMode;
      if (schema !== undefined) {
        this.validators.body = schema;
      }
    } else {
      this.bodyMode = "json";
      this.validators.body = modeOrSchema;
    }
    return this;
  }

  returns(map: ReturnsMap): this {
    this.returnsMap = this.returnsMap ? { ...this.returnsMap, ...map } : { ...map };
    return this;
  }

  requires(): this {
    return this;
  }

  handler(fn: (ctx: any, next: any) => any) {
    return this.toUnit(fn);
  }

  toUnit(fn?: (ctx: any, next: any) => any) {
    const schemas = pickDefinedSchemas(this.validators);
    return {
      ...(fn ? { handler: fn } : {}),
      ...schemas,
      ...(this.bodyMode ? { bodyMode: this.bodyMode } : {}),
      ...(this.returnsMap ? { returns: this.returnsMap, __returns: this.returnsMap } : {}),
      ...(this.__requiredLayouts !== undefined
        ? { __requiredLayouts: this.__requiredLayouts }
        : {}),
      __middlewareAcc: undefined as unknown,
    };
  }
}

export function createMiddlewareUnitBuilder(requiredLayouts?: string | readonly string[]) {
  return new MiddlewareUnitBuilderImpl(requiredLayouts);
}
