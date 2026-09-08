import type { Hono } from "hono";
import type {
  ContextDefinition,
  ContextOptions,
  HttpMethod,
  LayoutDefinition,
  MiddlewareArgs,
  MiddlewareHandler,
  NextFunction,
  RouteDefinition,
  RouteHandler,
  RouteHandlerArgs,
  RouteSchemas,
  TaserRequest,
} from "@taserjs/router";

export type {
  ContextDefinition,
  ContextOptions,
  HttpMethod,
  LayoutDefinition,
  MiddlewareArgs,
  MiddlewareHandler,
  NextFunction,
  RouteDefinition,
  RouteHandler,
  RouteHandlerArgs,
  RouteSchemas,
  TaserRequest,
};

export interface RouteManifestEntry {
  layouts?: readonly (string | LayoutDefinition | unknown)[] | undefined;
  route: RouteDefinition;
}

export interface RouteManifest {
  layouts?: Record<string, unknown> | undefined;
  routes: Record<string, Record<string, RouteManifestEntry | RouteDefinition>>;
}

export interface CreateTaserAppOptions {
  basePath?: string | undefined;
  context?: ContextDefinition | ContextOptions | undefined;
}

export type TaserApp = Hono;
