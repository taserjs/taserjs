import type { Hono } from "hono";
import type {
  ContextDefinition,
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
  ResponseOptions,
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
  ResponseOptions,
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
  readonly layouts?: readonly string[] | undefined;
  readonly route: RouteDefinition;
}

export interface RouteManifest {
  readonly layouts?: Record<string, LayoutDefinition> | undefined;
  readonly routes: Record<string, Record<string, RouteManifestEntry>>;
}

export type TaserApp = Hono;
