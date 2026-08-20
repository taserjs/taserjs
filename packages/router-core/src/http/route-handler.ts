import type { StandardSchemaV1 } from "@standard-schema/spec";
import { reply, ValidationError } from "@taserjs/router-utils";

import { handlePipelineError } from "./error-handler.js";
import {
  createTaserCookieJar,
  type CookieDefaults,
  type TaserCookieJar,
} from "../cookies/taser-cookies.js";
import type { OnErrorHandler, PipelineContext } from "../types.js";
import { finalizeReply, type FinalizeResponseOptions } from "./finalize.js";

export type RouteErrorState = {
  effectiveReturns: Record<number, StandardSchemaV1> | undefined;
  responseOptions: FinalizeResponseOptions;
  cookies: TaserCookieJar | undefined;
  cookieSecret?: string | BufferSource | undefined;
  cookieDefaults?: CookieDefaults;
  ctx: PipelineContext | undefined;
  request: Request;
  onErrorHandler: OnErrorHandler | undefined;
};

export async function handleRouteError(error: unknown, state: RouteErrorState): Promise<Response> {
  const jar =
    state.cookies ?? createTaserCookieJar(null, state.cookieSecret, state.cookieDefaults ?? {});
  const request = state.request;

  if (error instanceof Response) {
    return await finalizeReply(error, state.effectiveReturns, state.responseOptions, request, jar);
  }

  if (error instanceof ValidationError) {
    return await finalizeReply(
      reply.unprocessableEntity({ errors: error.issues }),
      state.effectiveReturns,
      state.responseOptions,
      request,
      jar,
    );
  }

  if (state.onErrorHandler) {
    try {
      const handled = await state.onErrorHandler.handle(error, state.ctx);
      return await finalizeReply(
        handled,
        state.onErrorHandler.responses as Record<number, StandardSchemaV1> | undefined,
        state.responseOptions,
        request,
        jar,
      );
    } catch (onErrorFailure) {
      return jar.applyTo(handlePipelineError(onErrorFailure));
    }
  }

  return jar.applyTo(handlePipelineError(error));
}
