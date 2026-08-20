import type { StandardSchemaV1 } from "@standard-schema/spec";
import { normalizeOnError, type ReplyResult } from "@taserjs/router-utils";
import { addRoute, createRouter, findRoute } from "rou3";

import { toWireResponse } from "../http/error-handler.js";
import { composePipeline } from "../pipeline/compose.js";
import { buildPipelineLayers } from "../pipeline/layers.js";
import { splitCookieRuntimeConfig } from "../cookies/taser-cookies.js";
import type {
  ContextFactory,
  CreateTaserRuntimeOptions,
  HttpMethod,
  NotFoundHandler,
  OnErrorHandler,
  PipelineContext,
  RouteHandler,
  RouteManifestShape,
  TaserNativeBoundRuntime,
  TaserRuntime,
} from "../types.js";
import { buildPipelineContext } from "../context/context.js";
import { finalizeReply, type FinalizeResponseOptions } from "../http/finalize.js";
import { toRou3RegisterPath } from "../http/route-path.js";
import { dispatchNotFound } from "./not-found.js";
import { joinRoutePrefix, normalizeRoutePrefix } from "../http/route-prefix.js";
import { requestScope } from "../context/request-scope.js";
import { buildEffectiveReturns } from "../pipeline/returns.js";
import { handleRouteError } from "../http/route-handler.js";
import { resolveScopeNative } from "../context/scope-native.js";

type PreparedRoute = {
  path: string;
  method: HttpMethod;
  effectiveReturns: Record<number, StandardSchemaV1> | undefined;
  run: (ctx: PipelineContext) => Promise<ReplyResult>;
};

type Rou3Router<T> = ReturnType<typeof createRouter<T>>;

function extractPathname(url: string): string {
  const schemeEnd = url.indexOf("://");
  const pathStart =
    schemeEnd === -1
      ? url.startsWith("/")
        ? 0
        : url.indexOf("/")
      : url.indexOf("/", schemeEnd + 3);
  if (pathStart === -1) {
    return "/";
  }
  const queryIndex = url.indexOf("?", pathStart);
  const hashIndex = url.indexOf("#", pathStart);
  const end =
    queryIndex === -1
      ? hashIndex === -1
        ? url.length
        : hashIndex
      : hashIndex === -1
        ? queryIndex
        : Math.min(queryIndex, hashIndex);
  return url.slice(pathStart, end) || "/";
}

function registerManifestRoutes(
  router: Rou3Router<PreparedRoute>,
  manifest: RouteManifestShape,
  pathPrefix: string,
): void {
  const normalizedPrefix = normalizeRoutePrefix(pathPrefix);

  for (const [path, methodMap] of Object.entries(manifest.routes)) {
    for (const [method, entry] of Object.entries(methodMap)) {
      if (!entry) {
        continue;
      }

      const httpMethod = method as HttpMethod;
      const routeEntry = entry;
      const route = routeEntry.route as RouteHandler;
      const prepared: PreparedRoute = {
        path,
        method: httpMethod,
        effectiveReturns: buildEffectiveReturns(manifest, routeEntry.layoutChain, route),
        run: composePipeline(
          buildPipelineLayers(manifest, routeEntry.layoutChain, route),
          async (pipelineCtx) => await route.handler(pipelineCtx),
        ),
      };

      const fullPath = joinRoutePrefix(normalizedPrefix, path);
      const rou3Path = toRou3RegisterPath(fullPath);

      addRoute(router, httpMethod, rou3Path, prepared);
    }
  }
}

export function createTaserRuntime(
  manifest: RouteManifestShape,
  createContext: ContextFactory,
  options: CreateTaserRuntimeOptions = {},
): TaserRuntime {
  const validateResponse = options.response?.validate ?? true;
  const onValidationFailure = options.response?.onValidationFailure;
  const responseOptions: FinalizeResponseOptions = {
    validate: validateResponse,
    ...(onValidationFailure !== undefined ? { onValidationFailure } : {}),
  };
  let onErrorHandler = options.onError;
  let notFoundHandler: NotFoundHandler | undefined = options.notFound;
  const { secret: cookieSecret, defaults: cookieDefaults } = splitCookieRuntimeConfig(
    options.cookies,
  );
  const basePath = options.basePath ?? "";

  const router = createRouter<PreparedRoute>();

  registerManifestRoutes(router, manifest, basePath);

  async function dispatchRequest(request: Request): Promise<Response> {
    const pathname = extractPathname(request.url);
    const method = request.method as HttpMethod;
    const match = findRoute(router, method, pathname);

    if (!match) {
      return dispatchNotFound(
        request,
        pathname,
        createContext,
        responseOptions,
        cookieSecret,
        cookieDefaults,
        () => notFoundHandler,
      );
    }

    const prepared = match.data;
    const params = (match.params ?? {}) as Record<string, unknown>;

    let ctx: PipelineContext | undefined;
    let cookies: import("../cookies/taser-cookies.js").TaserCookieJar | undefined;

    try {
      const built = await buildPipelineContext(
        request,
        params,
        pathname,
        prepared.method,
        createContext,
        cookieSecret,
        cookieDefaults,
      );
      ctx = built.ctx;
      cookies = built.cookies;

      const result = await prepared.run(ctx);
      return toWireResponse(
        await finalizeReply(result, prepared.effectiveReturns, responseOptions, request, cookies),
      );
    } catch (error) {
      return handleRouteError(error, {
        effectiveReturns: prepared.effectiveReturns,
        responseOptions,
        cookies,
        cookieSecret,
        cookieDefaults,
        ctx,
        request,
        onErrorHandler: onErrorHandler,
      });
    }
  }

  async function runFetch(
    boundNative: unknown | undefined,
    request: Request,
    env?: unknown,
    executionCtx?: unknown,
  ): Promise<Response> {
    const native = resolveScopeNative(boundNative, env, executionCtx);
    if (native === undefined) {
      return dispatchRequest(request);
    }
    return requestScope.run({ native }, () => dispatchRequest(request));
  }

  const runtime: TaserRuntime = {
    fetch(request, env, executionCtx) {
      return runFetch(undefined, request, env, executionCtx);
    },
    native(boundNative: unknown): TaserNativeBoundRuntime {
      return {
        fetch: (request, env, executionCtx) => runFetch(boundNative, request, env, executionCtx),
      };
    },
    onError(handler: OnErrorHandler | OnErrorHandler["handle"]) {
      onErrorHandler = normalizeOnError(handler);
      return runtime;
    },
    notFound(handler) {
      notFoundHandler = handler;
      return runtime;
    },
  };

  return runtime;
}
