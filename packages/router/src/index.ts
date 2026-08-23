export type { RouterRegister } from "./register.js";
export type {
  InferInput,
  InferOutput,
  InferRouteContext,
  InferRouteInput,
  InferRouteOutput,
  Method,
  PathParams,
  ReturnsMap,
  RouteDefinition,
  RouteExport,
  RoutePath,
  Schema,
  Simplify,
} from "./types/index.js";
export type {
  ContextDefinition,
  CreateTaserAppOptions,
  InferAppContext,
  InferAppManifest,
  OnErrorOptions,
  RouteManifestShape,
} from "./types/app.js";

export { ValidationError, validationErrorSchema } from "@taserjs/router-utils";
export type { ResponseValidationFailureHandler, SuccessStatusCode } from "@taserjs/router-utils";

export { createTaserApp, TaserRouter } from "./builder/router.js";
export { TaserApp } from "./builder/app.js";
export { createContext } from "./context/create-context.js";
export { defineHandler } from "./define/handler.js";
export { defineMiddleware } from "./define/middleware.js";
export { createNitroRouteHandler, type FetchableApp, type NitroFetchEvent } from "./entry/nitro.js";

export type { TaserCookieJar, TaserHeaders } from "@taserjs/router-core";
