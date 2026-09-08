import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  BodyMode,
  HttpMethod,
  LayoutDefinition,
  MiddlewareInput,
  RouteDefinition,
  RouteHandler,
  RouteSchemas,
  StatusCode,
} from "./types.js";

function appendMiddlewares(target: MiddlewareInput[], inputs: MiddlewareInput[]): void {
  for (const mw of inputs) {
    if (typeof mw === "function") {
      target.push(mw);
    } else if (mw && typeof mw.handler === "function") {
      if (mw.schemas && (mw.schemas.headers || mw.schemas.params || mw.schemas.query || mw.schemas.body)) {
        target.push(mw);
      } else {
        target.push(mw.handler);
      }
    }
  }
}

export class LayoutBuilder<TPath extends string = string> implements LayoutDefinition<TPath> {
  readonly kind = "layout" as const;
  public readonly path?: TPath | undefined;
  public readonly middlewares: MiddlewareInput[] = [];
  public readonly schemas: RouteSchemas = {};

  constructor(path?: TPath | undefined) {
    this.path = path;
  }

  use(...middlewares: MiddlewareInput[]): this {
    appendMiddlewares(this.middlewares, middlewares);
    return this;
  }

  params(schema: StandardSchemaV1): this {
    this.schemas.params = schema;
    return this;
  }

  query(schema: StandardSchemaV1): this {
    this.schemas.query = schema;
    return this;
  }

  headers(schema: StandardSchemaV1): this {
    this.schemas.headers = schema;
    return this;
  }

  body(schema: StandardSchemaV1, mode?: BodyMode): this {
    this.schemas.body = { schema, mode };
    return this;
  }

  returns(map: Record<StatusCode, StandardSchemaV1>): this {
    this.schemas.returns = { ...this.schemas.returns, ...map };
    return this;
  }
}

export class RouteBuilder<
  TPath extends string = string,
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  THeaders = Headers,
  TBody = unknown,
> {
  public readonly middlewares: MiddlewareInput[] = [];
  public readonly schemas: RouteSchemas = {};

  constructor(
    public readonly method: HttpMethod,
    public readonly path: TPath,
  ) {}

  use(...middlewares: MiddlewareInput[]): this {
    appendMiddlewares(this.middlewares, middlewares);
    return this;
  }

  params<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteBuilder<TPath, StandardSchemaV1.InferOutput<TSchema>, TQuery, THeaders, TBody> {
    this.schemas.params = schema;
    return this as unknown as RouteBuilder<
      TPath,
      StandardSchemaV1.InferOutput<TSchema>,
      TQuery,
      THeaders,
      TBody
    >;
  }

  query<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteBuilder<TPath, TParams, StandardSchemaV1.InferOutput<TSchema>, THeaders, TBody> {
    this.schemas.query = schema;
    return this as unknown as RouteBuilder<
      TPath,
      TParams,
      StandardSchemaV1.InferOutput<TSchema>,
      THeaders,
      TBody
    >;
  }

  headers(schema: StandardSchemaV1): this {
    this.schemas.headers = schema;
    return this;
  }

  body<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    mode?: BodyMode,
  ): RouteBuilder<TPath, TParams, TQuery, THeaders, StandardSchemaV1.InferOutput<TSchema>> {
    this.schemas.body = { schema, mode };
    return this as unknown as RouteBuilder<
      TPath,
      TParams,
      TQuery,
      THeaders,
      StandardSchemaV1.InferOutput<TSchema>
    >;
  }

  returns(map: Record<StatusCode, StandardSchemaV1>): this {
    this.schemas.returns = { ...this.schemas.returns, ...map };
    return this;
  }

  handler(
    fn: RouteHandler<TParams, TQuery, THeaders, TBody>,
  ): RouteDefinition<TPath> {
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
  get: <TPath extends string>(path: TPath) => new RouteBuilder("GET", path),
  post: <TPath extends string>(path: TPath) => new RouteBuilder("POST", path),
  put: <TPath extends string>(path: TPath) => new RouteBuilder("PUT", path),
  delete: <TPath extends string>(path: TPath) => new RouteBuilder("DELETE", path),
  patch: <TPath extends string>(path: TPath) => new RouteBuilder("PATCH", path),
  layout: <TPath extends string = string>(path?: TPath | undefined) => new LayoutBuilder(path),
};
