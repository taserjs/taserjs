import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { BodyMode, ValidationFacet } from "@taserjs/utils";
import type { RequestHeader } from "hono/utils/headers";

export type { BodyMode, ValidationFacet, RequestHeader };
export type { StandardSchemaV1 };

export type HeaderKey = RequestHeader | (string & {});

export interface TaserHeaders extends Headers {
  get(name: HeaderKey): string | null;
  has(name: HeaderKey): boolean;
}

export type StatusCode = number;

export interface RouteBodySchema {
  readonly schema: StandardSchemaV1;
  readonly mode?: BodyMode | undefined;
}

export interface RouteSchemas {
  params?: StandardSchemaV1 | undefined;
  query?: StandardSchemaV1 | undefined;
  body?: RouteBodySchema | undefined;
  returns?: Record<StatusCode, StandardSchemaV1> | undefined;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface TaserRequest<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> {
  params: TParams;
  query: TQuery;
  headers: TaserHeaders;
  method: string;
  url: string;
  raw: Request;
  body?: TBody;
}

export interface RouteHandlerArgs<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> {
  req: TaserRequest<TParams, TQuery, TBody>;
  ctx: Record<string, unknown>;
  state: Record<string, unknown>;
}

export type RouteHandler<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> = (args: RouteHandlerArgs<TParams, TQuery, TBody>) => Response | Promise<Response>;

export type NextFunction = (state?: Record<string, unknown> | undefined) => Promise<Response>;

export interface MiddlewareArgs {
  req: TaserRequest;
  ctx: Record<string, unknown>;
  state: Record<string, unknown>;
}

export type MiddlewareHandler = (
  args: MiddlewareArgs,
  next: NextFunction,
) => Response | Promise<Response>;

export interface MiddlewareDefinition {
  readonly kind: "middleware";
  readonly handler: MiddlewareHandler;
  readonly schemas?: RouteSchemas | undefined;
}

export type MiddlewareInput = MiddlewareHandler | MiddlewareDefinition;

export interface LayoutDefinition<TPath extends string = string> {
  readonly kind: "layout";
  readonly path?: TPath | undefined;
  readonly middlewares: readonly MiddlewareDefinition[];
}

export interface RouteDefinition<TPath extends string = string> {
  readonly kind: "route";
  readonly method: HttpMethod;
  readonly path: TPath;
  readonly middlewares?: readonly MiddlewareDefinition[] | undefined;
  readonly handler: RouteHandler;
  readonly schemas?: RouteSchemas | undefined;
  readonly returns?: Record<StatusCode, StandardSchemaV1> | undefined;
}

export interface ContextOptions<
  TBoot extends Record<string, unknown> = Record<string, unknown>,
  TRequest extends Record<string, unknown> = Record<string, unknown>,
> {
  boot?: (() => TBoot | Promise<TBoot>) | undefined;
  request?: ((req: TaserRequest) => TRequest | Promise<TRequest>) | undefined;
}

export interface ContextDefinition<
  TBoot extends Record<string, unknown> = Record<string, unknown>,
  TRequest extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly kind: "context";
  readonly boot?: (() => TBoot | Promise<TBoot>) | undefined;
  readonly request?: ((req: TaserRequest) => TRequest | Promise<TRequest>) | undefined;
}
