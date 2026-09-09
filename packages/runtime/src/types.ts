import type { Hono } from "hono";
import type {
  ContextDefinition,
  ContextOptions,
  HeaderKey,
  HttpMethod,
  LayoutDefinition,
  MiddlewareArgs,
  MiddlewareDefinition,
  MiddlewareHandler,
  MiddlewareInput,
  NextFunction,
  NotFoundHandler,
  OnErrorHandler,
  RequestHeader,
  RouteDefinition,
  RouteHandler,
  RouteHandlerArgs,
  RouteSchemas,
  TaserAppOptions,
  TaserDefinition,
  TaserHeaders,
  TaserRequest,
} from "@taserjs/router";

export type {
  ContextDefinition,
  ContextOptions,
  HeaderKey,
  HttpMethod,
  LayoutDefinition,
  MiddlewareArgs,
  MiddlewareDefinition,
  MiddlewareHandler,
  MiddlewareInput,
  NextFunction,
  NotFoundHandler,
  OnErrorHandler,
  RequestHeader,
  RouteDefinition,
  RouteHandler,
  RouteHandlerArgs,
  RouteSchemas,
  TaserAppOptions,
  TaserDefinition,
  TaserHeaders,
  TaserRequest,
};

export interface RouteManifestEntry {
  layouts?: readonly (string | LayoutDefinition)[] | undefined;
  route: RouteDefinition;
}

export interface RouteManifest {
  layouts?: Record<string, LayoutDefinition> | undefined;
  routes: Record<string, Record<string, RouteManifestEntry | RouteDefinition>>;
}

export interface CreateTaserAppOptions {
  basePath?: string | undefined;
  context?: ContextOptions | undefined;
  notFound?: NotFoundHandler<any> | undefined;
  onError?: OnErrorHandler | undefined;
}

export type TaserAppDefinition = TaserDefinition<any> | CreateTaserAppOptions;

export type TaserApp = Hono;
