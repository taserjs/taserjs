import { isPromise } from "@taserjs/router-utils";
import { notFound } from "@taserjs/router-utils/reply";

import { handlePipelineError } from "../http/error-handler.js";
import type { CookieDefaults } from "../cookies/taser-cookies.js";
import type { ContextFactory, NotFoundHandler } from "../types.js";
import { buildNotFoundContext, getCookiesFromContext } from "../context/context.js";
import { finalizeReply, type FinalizeResponseOptions } from "../http/finalize.js";

export async function dispatchNotFound(
  request: Request,
  pathname: string,
  createContext: ContextFactory,
  responseOptions: FinalizeResponseOptions,
  cookieSecret: string | BufferSource | undefined,
  cookieDefaults: CookieDefaults,
  getHandler: () => NotFoundHandler | undefined,
): Promise<Response> {
  const notFoundHandler = getHandler();
  if (notFoundHandler) {
    try {
      const ctxResult = buildNotFoundContext(
        request,
        pathname,
        request.method.toUpperCase(),
        createContext,
        cookieSecret,
        cookieDefaults,
      );
      const ctx = isPromise(ctxResult) ? await ctxResult : ctxResult;
      const result = await notFoundHandler(ctx);
      const cookies = getCookiesFromContext(ctx);
      return finalizeReply(result, undefined, responseOptions, request, cookies);
    } catch (error) {
      return handlePipelineError(error);
    }
  }
  return notFound();
}
