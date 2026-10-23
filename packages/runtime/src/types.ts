import type {
  LayoutDefinition,
  MiddlewareDefinition,
  MiddlewareHandler,
  NextFunction,
  ResponseOptions,
  RouteDefinition,
  RouteHandler,
  RouteSchemas,
  TaserAppOptions,
  TaserDefinition,
  TaserHeaders,
  TaserRequest,
} from "@taserjs/router";
import type { Hono } from "hono";

export type {
  LayoutDefinition,
  MiddlewareDefinition,
  MiddlewareHandler,
  NextFunction,
  ResponseOptions,
  RouteDefinition,
  RouteHandler,
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
