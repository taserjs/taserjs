import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  isPromise,
  type ResponseValidationFailureHandler,
  validateReply,
} from "@taserjs/router-utils";

import { toResponse } from "./error-handler.js";
import type { TaserCookieJar } from "../cookies/taser-cookies.js";

export type FinalizeResponseOptions = {
  validate: boolean;
  onValidationFailure?: ResponseValidationFailureHandler | undefined;
};

export function finalizeReply(
  value: unknown,
  returnsMap: Record<number, StandardSchemaV1> | undefined,
  responseOptions: FinalizeResponseOptions,
  request: Request,
  cookies?: TaserCookieJar | undefined,
): Promise<Response> | Response {
  const response = toResponse(value);

  if (!responseOptions.validate || !returnsMap) {
    return cookies ? cookies.applyTo(response) : response;
  }

  const validatedResult = validateReply(response, returnsMap, {
    request,
    ...(responseOptions.onValidationFailure !== undefined
      ? { onValidationFailure: responseOptions.onValidationFailure }
      : {}),
  });

  if (isPromise(validatedResult)) {
    return validatedResult.then((validated) => (cookies ? cookies.applyTo(validated) : validated));
  }

  return cookies ? cookies.applyTo(validatedResult) : validatedResult;
}
