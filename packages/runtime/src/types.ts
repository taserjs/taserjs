import type { Hono } from "hono";

export interface TaserRequest {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Headers;
  method: string;
  url: string;
  raw: Request;
}

export interface RouteHandlerArgs {
  req: TaserRequest;
  ctx: Record<string, unknown>;
  state: Record<string, unknown>;
}

export type RouteHandler = (args: RouteHandlerArgs) => Response | Promise<Response>;

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RouteDefinition {
  readonly kind: "route";
  readonly method: HttpMethod | string;
  readonly path: string;
  readonly handler: RouteHandler;
}

export interface RouteManifestEntry {
  layouts?: readonly string[];
  route: RouteDefinition;
}

export interface RouteManifest {
  layouts?: Record<string, unknown>;
  routes: Record<string, Record<string, RouteManifestEntry | RouteDefinition>>;
}

export interface CreateTaserAppOptions {
  basePath?: string;
}

export type TaserApp = Hono;
