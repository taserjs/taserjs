export { InvalidMountPatternError, resolveMountBase, composeBasePath } from "./mount/index.js";
export { isPromise } from "./async/is-promise.js";

export type { StatusCode, SuccessStatusCode } from "./http/status.js";
export {
  HTTP_METHODS,
  HTTP_VERBS,
  isHttpMethod,
  type HttpMethod,
  type HttpVerb,
  type HttpMethodLower,
} from "./http/methods.js";
export { normalizeOnError } from "./http/on-error.js";
export type { OnErrorHandlerLike, OnErrorInput } from "./http/on-error.js";

export {
  hasInputSchemas,
  mergeReturnsMaps,
  ValidationError,
  validateReply,
  validateSchema,
  validationErrorSchema,
  withAuto422,
  collectReturnsFromDefinitions,
} from "./validation/index.js";
export type {
  ReturnsMap,
  ResponseValidationFailureHandler,
  ValidateReplyOptions,
} from "./validation/index.js";
