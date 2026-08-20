export type { RouterRegister } from "./register.js";
export type {
  InferInput,
  InferOutput,
  Method,
  PathParams,
  ReturnsMap,
  RoutePath,
  Schema,
  Simplify,
} from "./types/index.js";
export type {
  ContextDefinition,
  CreateContextArgs,
  CreateTaserAppOptions,
  InferAppContext,
  InferAppManifest,
  OnErrorOptions,
  RouteManifestShape,
  TaserHandler,
} from "./types/app.js";

export {
  isReplyResult,
  reply,
  stream,
  ValidationError,
  validationErrorSchema,
} from "@taserjs/router-utils";
export type {
  ReplyBodyKind,
  ReplyOf,
  ResponseValidationFailureHandler,
  SuccessReplyData,
  SuccessStatusCode,
} from "@taserjs/router-utils";

export { createTaserApp, TaserRouter } from "./builder/router.js";
export { TaserApp, TaserNativeBound } from "./builder/app.js";
export { createContext } from "./context/create-context.js";
export { defineHandler } from "./define/handler.js";
export { defineMiddleware } from "./define/middleware.js";

export type { TaserCookieJar, TaserHeaders } from "@taserjs/router-core";
