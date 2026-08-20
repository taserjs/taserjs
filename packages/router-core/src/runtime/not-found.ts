import { reply } from "@taserjs/router-utils";

import { handlePipelineError, toWireResponse } from "../http/error-handler.js";
import { createTaserCookieJar, type CookieDefaults } from "../cookies/taser-cookies.js";
import type { ContextFactory, NotFoundHandler } from "../types.js";
import { buildNotFoundContext } from "../context/context.js";
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
  const cookies = createTaserCookieJar(
    request.headers.get("cookie") ?? null,
    cookieSecret,
    cookieDefaults,
  );
  const notFoundHandler = getHandler();
  if (notFoundHandler) {
    try {
      const ctx = await buildNotFoundContext(
        request,
        pathname,
        request.method.toUpperCase(),
        createContext,
        cookies,
      );
      const result = await notFoundHandler(ctx);
      return toWireResponse(
        await finalizeReply(result, undefined, responseOptions, request, cookies),
      );
    } catch (error) {
      return toWireResponse(cookies.applyTo(handlePipelineError(error)));
    }
  }
  return toWireResponse(cookies.applyTo(reply.notFound()));
}
