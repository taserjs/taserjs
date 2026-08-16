import type { StandardSchemaV1 } from "@standard-schema/spec";
import { reply, type ResponseValidationFailureHandler, validateReply } from "@taserjs/router-utils";

import { toResponse } from "../error-handler.js";
import type { TaserCookieJar } from "../taser-cookies.js";

export type FinalizeResponseOptions = {
  validate: boolean;
  onValidationFailure?: ResponseValidationFailureHandler | undefined;
};

export async function finalizeReply(
  value: unknown,
  returnsMap: Record<number, StandardSchemaV1> | undefined,
  responseOptions: FinalizeResponseOptions,
  request: Request,
  cookies: TaserCookieJar,
): Promise<Response> {
  const response = toResponse(value);
  const validated = responseOptions.validate
    ? await validateReply(response, returnsMap, {
        request,
        ...(responseOptions.onValidationFailure !== undefined
          ? { onValidationFailure: responseOptions.onValidationFailure }
          : {}),
      })
    : response;
  return cookies.applyTo(validated);
}

export { reply };
