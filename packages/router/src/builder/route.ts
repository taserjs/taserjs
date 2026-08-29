import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  collectReturnsFromDefinitions,
  hasInputSchemas,
  mergeReturnsMaps,
  withAuto422,
} from "@taserjs/router-utils";
import type { BodyMode } from "@taserjs/router-core";

import type {
  Method,
  RouteBuilder,
  RoutePath,
  ReturnsMap,
  ValidatorParts,
  Schema,
} from "../types/index.js";
import type { HttpMethod, MiddlewareDefinition } from "../types/units.js";
import { isHandlerUnit } from "../types/units.js";
import { HANDLER_SCHEMA_KEY_MAP } from "./constants.js";
import { pickDefinedSchemas, type SchemaValidators } from "../define/validators.js";

function toUtilsMap(map: ReturnsMap | undefined): Record<number, StandardSchemaV1> {
  if (!map) {
    return {};
  }
  const out: Record<number, StandardSchemaV1> = {};
  for (const [key, schema] of Object.entries(map)) {
    if (schema !== undefined) {
      out[Number(key)] = schema;
    }
  }
  return out;
}

function buildEffectiveReturns(args: {
  middlewareReturns: ReturnsMap;
  routeReturns: ReturnsMap;
  handlerMiddlewareReturns: ReturnsMap;
  handlerReturns: ReturnsMap | undefined;
  schemas: {
    query?: unknown;
    params?: unknown;
    body?: unknown;
    handlerQuery?: unknown;
    handlerParams?: unknown;
    handlerBody?: unknown;
    middlewares?: readonly MiddlewareDefinition[];
    handlerMiddlewares?: readonly MiddlewareDefinition[];
  };
}): Record<number, StandardSchemaV1> | undefined {
  const merged = mergeReturnsMaps(
    toUtilsMap(args.middlewareReturns),
    toUtilsMap(args.routeReturns),
    toUtilsMap(args.handlerMiddlewareReturns),
    toUtilsMap(args.handlerReturns),
  );
  const with422 = withAuto422(merged, hasInputSchemas(args.schemas));
  return Object.keys(with422).length > 0 ? with422 : undefined;
}

function buildRouteBase(
  path: string,
  method: HttpMethod | "ANY" | "ALL",
  methods: readonly HttpMethod[] | undefined,
  middlewares: MiddlewareDefinition[],
) {
  return {
    path,
    method,
    ...(methods ? { methods: [...methods] } : {}),
    middlewares: [...middlewares],
  };
}

/** Shared internal builder — not part of the public `@taserjs/router` API. */
export function createRouteBuilder(
  path: string,
  method: HttpMethod | "ANY" | "ALL",
  methods?: readonly HttpMethod[],
): RouteBuilder<RoutePath, Method, readonly [], ValidatorParts> {
  const middlewares: MiddlewareDefinition[] = [];
  let routeReturns: Record<number, StandardSchemaV1> = {};
  const validators: SchemaValidators = {};
  let bodyMode: BodyMode | undefined;

  const builder = {
    path,
    method,
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
      routeReturns = { ...routeReturns, ...toUtilsMap(map) };
      return builder;
    },
    use(definition: MiddlewareDefinition | ((ctx: any, next: any) => any)) {
      if (typeof definition === "function") {
        middlewares.push({ handler: definition as any });
      } else {
        middlewares.push(definition);
      }
      return builder;
    },
    handler(fnOrUnit: ((ctx: unknown) => unknown) | unknown) {
      const routeSchemas = pickDefinedSchemas(validators);
      const base = buildRouteBase(path, method, methods, middlewares);

      const unit = isHandlerUnit(fnOrUnit)
        ? fnOrUnit
        : {
            handler: fnOrUnit as (ctx: unknown) => Response | Promise<Response>,
            middlewares: [] as MiddlewareDefinition[],
            returns: undefined as ReturnsMap | undefined,
          };

      const handlerSchemas = isHandlerUnit(fnOrUnit)
        ? pickDefinedSchemas(fnOrUnit, HANDLER_SCHEMA_KEY_MAP)
        : {};

      const returns = buildEffectiveReturns({
        middlewareReturns: collectReturnsFromDefinitions(middlewares),
        routeReturns,
        handlerMiddlewareReturns: collectReturnsFromDefinitions(unit.middlewares),
        handlerReturns: unit.returns,
        schemas: {
          ...validators,
          handlerQuery: (unit as any).query,
          handlerParams: (unit as any).params,
          handlerBody: (unit as any).body,
          middlewares,
          handlerMiddlewares: unit.middlewares,
        },
      });

      return {
        ...base,
        handlerMiddlewares: [...unit.middlewares],
        handler: unit.handler,
        ...routeSchemas,
        ...handlerSchemas,
        ...(bodyMode ? { bodyMode } : {}),
        ...(returns ? { returns } : {}),
      };
    },
  };

  return builder as unknown as RouteBuilder<RoutePath, Method, readonly [], ValidatorParts>;
}
