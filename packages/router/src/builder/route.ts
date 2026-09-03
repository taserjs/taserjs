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
import { pickDefinedSchemas, type SchemaValidators } from "../define/validators.js";

function buildEffectiveReturns(args: {
  middlewareReturns: ReturnsMap;
  routeReturns: ReturnsMap;
  schemas: {
    query?: unknown;
    params?: unknown;
    body?: unknown;
    middlewares?: readonly MiddlewareDefinition[];
  };
}): Record<number, StandardSchemaV1> | undefined {
  const merged = mergeReturnsMaps(
    args.middlewareReturns as Record<number, StandardSchemaV1>,
    args.routeReturns as Record<number, StandardSchemaV1>,
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

class RouteBuilderImpl {
  readonly path: string;
  readonly method: HttpMethod | "ANY" | "ALL";
  readonly methods: readonly HttpMethod[] | undefined;
  private readonly middlewares: MiddlewareDefinition[] = [];
  private readonly routeReturns: Record<number, StandardSchemaV1> = {};
  private readonly validators: SchemaValidators = {};
  private bodyMode: BodyMode | undefined;

  constructor(path: string, method: HttpMethod | "ANY" | "ALL", methods?: readonly HttpMethod[]) {
    this.path = path;
    this.method = method;
    this.methods = methods;
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
    Object.assign(this.routeReturns, map);
    return this;
  }

  use(definition: MiddlewareDefinition | ((ctx: any, next: any) => any)): this {
    if (typeof definition === "function") {
      this.middlewares.push({ handler: definition as any });
    } else if (typeof (definition as any)?.toUnit === "function") {
      this.middlewares.push((definition as any).toUnit());
    } else {
      this.middlewares.push(definition);
    }
    return this;
  }

  handler(fn: (ctx: unknown) => Response | Promise<Response>) {
    const routeSchemas = pickDefinedSchemas(this.validators);
    const base = buildRouteBase(this.path, this.method, this.methods, this.middlewares);

    const returns = buildEffectiveReturns({
      middlewareReturns: collectReturnsFromDefinitions(this.middlewares),
      routeReturns: this.routeReturns,
      schemas: {
        ...this.validators,
        middlewares: this.middlewares,
      },
    });

    return {
      ...base,
      handler: fn,
      ...routeSchemas,
      ...(this.bodyMode ? { bodyMode: this.bodyMode } : {}),
      ...(returns ? { returns } : {}),
    };
  }
}

/** Shared internal builder — not part of the public `@taserjs/router` API. */
export function createRouteBuilder(
  path: string,
  method: HttpMethod | "ANY" | "ALL",
  methods?: readonly HttpMethod[],
): RouteBuilder<RoutePath, Method, readonly [], ValidatorParts> {
  return new RouteBuilderImpl(path, method, methods) as unknown as RouteBuilder<
    RoutePath,
    Method,
    readonly [],
    ValidatorParts
  >;
}
