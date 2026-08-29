import type { BodyMode } from "@taserjs/router-core";

import type { ReturnsMap } from "../types/returns.js";
import type { Schema } from "../types/schema.js";
import { pickDefinedSchemas, type SchemaValidators } from "../define/validators.js";

export function createMiddlewareUnitBuilder(requiredLayouts?: string | readonly string[]) {
  const validators: SchemaValidators = {};
  let bodyMode: BodyMode | undefined;
  let returnsMap: ReturnsMap | undefined;

  const builder = {
    query(schema: Schema<unknown>) {
      validators.query = schema;
      return builder;
    },
    params(schema: Schema<unknown>) {
      validators.params = schema;
      return builder;
    },
    body(modeOrSchema: BodyMode | Schema<unknown>, schema?: Schema<unknown>) {
      if (typeof modeOrSchema === "string") {
        bodyMode = modeOrSchema as BodyMode;
        if (schema !== undefined) {
          validators.body = schema;
        }
      } else {
        bodyMode = "json";
        validators.body = modeOrSchema;
      }
      return builder;
    },
    returns(map: ReturnsMap) {
      returnsMap = { ...returnsMap, ...map };
      return builder;
    },
    requires() {
      return builder;
    },
    handler(fn: (ctx: any, next: any) => any) {
      const schemas = pickDefinedSchemas(validators);
      const unit = {
        handler: fn,
        ...schemas,
        ...(bodyMode ? { bodyMode } : {}),
        ...(returnsMap ? { returns: returnsMap, __returns: returnsMap } : {}),
        ...(requiredLayouts !== undefined ? { __requiredLayouts: requiredLayouts } : {}),
        __middlewareAcc: undefined as unknown,
      };
      return unit;
    },
  };

  return builder;
}
