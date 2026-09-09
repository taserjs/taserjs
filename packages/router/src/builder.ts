import type { StandardSchemaV1 } from "@standard-schema/spec";
import { hono } from "./hono.js";
import type {
  BodyMode,
  HttpMethod,
  LayoutDefinition,
  MiddlewareDefinition,
  MiddlewareHandler,
  RouteDefaultParams,
  RouteDefinition,
  RouteHandler,
  RouteSchemas,
  StatusCode,
} from "./types.js";

export function toMiddlewareDefinition(
  input: MiddlewareDefinition | MiddlewareHandler<any, any>,
): MiddlewareDefinition {
  if (typeof input === "function") {
    return {
      kind: "middleware",
      handler: input as MiddlewareHandler,
    };
  }
  return input;
}

export class MiddlewareBuilder {
  public readonly schemas: RouteSchemas = {};

  params(schema: StandardSchemaV1): this {
    this.schemas.params = schema;
    return this;
  }

  query(schema: StandardSchemaV1): this {
    this.schemas.query = schema;
    return this;
  }

  body(schema: StandardSchemaV1, mode?: BodyMode): this {
    this.schemas.body = { schema, mode };
    return this;
  }

  handler(fn: MiddlewareHandler): MiddlewareDefinition {
    return {
      kind: "middleware",
      handler: fn,
      schemas: Object.keys(this.schemas).length > 0 ? { ...this.schemas } : undefined,
    };
  }
}

export function middleware(fn: MiddlewareHandler): MiddlewareDefinition;
export function middleware(): MiddlewareBuilder;
export function middleware(fn?: MiddlewareHandler): MiddlewareBuilder | MiddlewareDefinition {
  if (fn) {
    return {
      kind: "middleware",
      handler: fn,
    };
  }
  return new MiddlewareBuilder();
}

export class LayoutBuilder<
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
> implements LayoutDefinition<TPath> {
  readonly kind = "layout" as const;
  public readonly path: TPath;
  public readonly middlewares: MiddlewareDefinition[] = [];

  constructor(path: TPath) {
    this.path = path;
  }

  use(...middlewares: (MiddlewareDefinition | MiddlewareHandler<any, TParams>)[]): this {
    for (const mw of middlewares) {
      this.middlewares.push(toMiddlewareDefinition(mw));
    }
    return this;
  }
}

export function layout<TPath extends string>(
  path: TPath,
): LayoutBuilder<TPath, RouteDefaultParams<TPath>> {
  return new LayoutBuilder<TPath, RouteDefaultParams<TPath>>(path);
}

export class RouteBuilder<
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> {
  public readonly middlewares: MiddlewareDefinition[] = [];
  public readonly schemas: RouteSchemas = {};

  constructor(
    public readonly method: HttpMethod,
    public readonly path: TPath,
  ) {}

  use(...middlewares: (MiddlewareDefinition | MiddlewareHandler<any, TParams>)[]): this {
    for (const mw of middlewares) {
      this.middlewares.push(toMiddlewareDefinition(mw));
    }
    return this;
  }

  params<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteBuilder<TPath, StandardSchemaV1.InferOutput<TSchema>, TQuery, TBody> {
    this.schemas.params = schema;
    return this as unknown as RouteBuilder<
      TPath,
      StandardSchemaV1.InferOutput<TSchema>,
      TQuery,
      TBody
    >;
  }

  query<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteBuilder<TPath, TParams, StandardSchemaV1.InferOutput<TSchema>, TBody> {
    this.schemas.query = schema;
    return this as unknown as RouteBuilder<
      TPath,
      TParams,
      StandardSchemaV1.InferOutput<TSchema>,
      TBody
    >;
  }

  body<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    mode?: BodyMode,
  ): RouteBuilder<TPath, TParams, TQuery, StandardSchemaV1.InferOutput<TSchema>> {
    this.schemas.body = { schema, mode };
    return this as unknown as RouteBuilder<
      TPath,
      TParams,
      TQuery,
      StandardSchemaV1.InferOutput<TSchema>
    >;
  }

  returns(map: Record<StatusCode, StandardSchemaV1>): this {
    this.schemas.returns = { ...this.schemas.returns, ...map };
    return this;
  }

  handler(fn: RouteHandler<TParams, TQuery, TBody>): RouteDefinition<TPath> {
    return {
      kind: "route",
      method: this.method,
      path: this.path,
      middlewares: [...this.middlewares],
      handler: fn as RouteHandler,
      schemas: { ...this.schemas },
      returns: this.schemas.returns ? { ...this.schemas.returns } : undefined,
    };
  }
}

export const t = {
  get: <TPath extends string>(path: TPath) =>
    new RouteBuilder<TPath, RouteDefaultParams<TPath>>("GET", path),
  post: <TPath extends string>(path: TPath) =>
    new RouteBuilder<TPath, RouteDefaultParams<TPath>>("POST", path),
  put: <TPath extends string>(path: TPath) =>
    new RouteBuilder<TPath, RouteDefaultParams<TPath>>("PUT", path),
  delete: <TPath extends string>(path: TPath) =>
    new RouteBuilder<TPath, RouteDefaultParams<TPath>>("DELETE", path),
  patch: <TPath extends string>(path: TPath) =>
    new RouteBuilder<TPath, RouteDefaultParams<TPath>>("PATCH", path),
  layout,
  middleware,
  hono,
};
