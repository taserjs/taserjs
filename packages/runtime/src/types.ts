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
  RequestHeader,
  RouteDefinition,
  RouteHandler,
  RouteHandlerArgs,
  RouteSchemas,
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
  RequestHeader,
  RouteDefinition,
  RouteHandler,
  RouteHandlerArgs,
  RouteSchemas,
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
  context?: ContextDefinition | ContextOptions | undefined;
}

export type TaserApp = Hono;
