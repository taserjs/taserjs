import { reply } from "@taserjs/router-utils";

import { handlePipelineError, toWireResponse } from "../error-handler.js";
import { createTaserCookieJar, type CookieDefaults } from "../taser-cookies.js";
import type { ContextFactory } from "../types.js";
import { buildNotFoundContext } from "./context.js";
import { finalizeReply, type FinalizeResponseOptions } from "./finalize.js";
import type { NotFoundHandler } from "./types.js";

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
