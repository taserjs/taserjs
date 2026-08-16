import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  collectReturnsFromDefinitions,
  hasInputSchemas,
  mergeReturnsMaps,
  withAuto422,
} from "@taserjs/router-utils";

import type { Method, RouteBuilder, RoutePath, ReturnsMap, ValidatorParts } from "./types/index.js";
import type { HttpMethod, MiddlewareDefinition } from "./types/units.js";
import { isHandlerUnit } from "./types/units.js";
import { HANDLER_SCHEMA_KEY_MAP } from "./constants.js";
import { pickDefinedSchemas, type SchemaValidators } from "./define/validators.js";

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
  validators: SchemaValidators = {},
  methods?: readonly HttpMethod[],
): RouteBuilder<RoutePath, Method, readonly [], ValidatorParts> {
  const middlewares: MiddlewareDefinition[] = [];
  let routeReturns: Record<number, StandardSchemaV1> = {};

  const builder = {
    path,
    method,
    returns(map: ReturnsMap) {
      routeReturns = { ...routeReturns, ...toUtilsMap(map) };
      return builder;
    },
    use(definition: MiddlewareDefinition) {
      middlewares.push(definition);
      return builder;
    },
    handler(fnOrUnit: ((ctx: unknown) => unknown) | unknown) {
      const routeSchemas = pickDefinedSchemas(validators);
      const base = buildRouteBase(path, method, methods, middlewares);

      if (isHandlerUnit(fnOrUnit)) {
        const handlerSchemas = pickDefinedSchemas(fnOrUnit, HANDLER_SCHEMA_KEY_MAP);
        const returns = buildEffectiveReturns({
          middlewareReturns: collectReturnsFromDefinitions(middlewares),
          routeReturns: routeReturns,
          handlerMiddlewareReturns: collectReturnsFromDefinitions(fnOrUnit.middlewares),
          handlerReturns: fnOrUnit.returns,
          schemas: {
            ...validators,
            handlerQuery: fnOrUnit.query,
            handlerParams: fnOrUnit.params,
            handlerBody: fnOrUnit.body,
            middlewares,
            handlerMiddlewares: fnOrUnit.middlewares,
          },
        });

        return {
          ...base,
          handlerMiddlewares: [...fnOrUnit.middlewares],
          handler: fnOrUnit.handler,
          ...routeSchemas,
          ...handlerSchemas,
          ...(returns ? { returns } : {}),
        };
      }

      const returns = buildEffectiveReturns({
        middlewareReturns: collectReturnsFromDefinitions(middlewares),
        routeReturns: routeReturns,
        handlerMiddlewareReturns: {},
        handlerReturns: undefined,
        schemas: {
          ...validators,
          middlewares,
        },
      });

      return {
        ...base,
        handlerMiddlewares: [],
        handler: fnOrUnit as (ctx: unknown) => Response | Promise<Response>,
        ...routeSchemas,
        ...(returns ? { returns } : {}),
      };
    },
  };

  return builder as unknown as RouteBuilder<RoutePath, Method, readonly [], ValidatorParts>;
}
