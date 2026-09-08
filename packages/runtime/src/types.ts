import type { Hono } from "hono";

export interface TaserRequest {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Headers;
  method: string;
  url: string;
  raw: Request;
  body?: unknown | undefined;
}

export interface RouteHandlerArgs {
  req: TaserRequest;
  ctx: Record<string, unknown>;
  state: Record<string, unknown>;
}

export type RouteHandler = (args: RouteHandlerArgs) => Response | Promise<Response>;

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

export interface LayoutDefinition<TPath extends string = string> {
  readonly kind: "layout";
  readonly path?: TPath | undefined;
  readonly middlewares: readonly MiddlewareHandler[];
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RouteDefinition {
  readonly kind: "route";
  readonly method: HttpMethod | string;
  readonly path: string;
  readonly middlewares?: readonly MiddlewareHandler[] | undefined;
  readonly handler: RouteHandler;
}

export interface RouteManifestEntry {
  layouts?: readonly (string | LayoutDefinition | unknown)[] | undefined;
  route: RouteDefinition;
}

export interface RouteManifest {
  layouts?: Record<string, unknown> | undefined;
  routes: Record<string, Record<string, RouteManifestEntry | RouteDefinition>>;
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

export interface CreateTaserAppOptions {
  basePath?: string | undefined;
  context?: ContextDefinition | ContextOptions | undefined;
}

export type TaserApp = Hono;
