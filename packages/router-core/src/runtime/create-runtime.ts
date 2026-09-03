import type { StandardSchemaV1 } from "@standard-schema/spec";
import { extractPathname, isPromise, normalizeOnError } from "@taserjs/router-utils";
import { RegExpRouter } from "hono/router/reg-exp-router";

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
  TaserRuntime,
} from "../types.js";
import { buildPipelineContext, getCookiesFromContext } from "../context/context.js";
import { finalizeReply, type FinalizeResponseOptions } from "../http/finalize.js";
import { toHonoRoutePath } from "../http/route-path.js";
import { dispatchNotFound } from "./not-found.js";
import { joinRoutePrefix, normalizeRoutePrefix } from "../http/route-prefix.js";
import { buildEffectiveReturns } from "../pipeline/returns.js";
import { handleRouteError } from "../http/route-handler.js";

type PreparedRoute = {
  path: string;
  method: HttpMethod;
  effectiveReturns: Record<number, StandardSchemaV1> | undefined;
  run: (ctx: PipelineContext) => Promise<Response> | Response;
};

type HonoRegExpRouter<T> = InstanceType<typeof RegExpRouter<T>>;

type ParamEntry = readonly [name: string, index: number];

const paramEntriesCache = new WeakMap<object, readonly ParamEntry[]>();

function getParamEntries(paramLabels: object | undefined): readonly ParamEntry[] {
  if (!paramLabels) return [];
  let entries = paramEntriesCache.get(paramLabels);
  if (!entries) {
    entries = Object.entries(paramLabels).map(([name, index]) => [name, index as number] as const);
    paramEntriesCache.set(paramLabels, entries);
  }
  return entries;
}

function registerManifestRoutes(
  router: HonoRegExpRouter<PreparedRoute>,
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
        effectiveReturns: buildEffectiveReturns(manifest, routeEntry.layouts, route),
        run: composePipeline(
          buildPipelineLayers(manifest, routeEntry.layouts, route),
          route.handler,
        ),
      };

      const fullPath = joinRoutePrefix(normalizedPrefix, path);
      const honoPath = toHonoRoutePath(fullPath);

      router.add(httpMethod, honoPath, prepared);
    }
  }
}

export function createTaserRuntime<
  const TOptions extends CreateTaserRuntimeOptions = CreateTaserRuntimeOptions,
>(
  manifest: RouteManifestShape,
  createContext: ContextFactory,
  options: TOptions = {} as TOptions,
): TaserRuntime<TOptions extends { notFound: NotFoundHandler } ? true : false> {
  const validateResponse = options.response?.validate ?? true;
  const onValidationFailure = options.response?.onValidationFailure;
  const responseOptions: FinalizeResponseOptions = {
    validate: validateResponse,
    ...(onValidationFailure !== undefined ? { onValidationFailure } : {}),
  };
  let onErrorHandler = options.onError;
  let notFoundHandler = options.notFound;
  const { secret: cookieSecret, defaults: cookieDefaults } = splitCookieRuntimeConfig(
    options.cookies,
  );
  const basePath = options.basePath ?? "";

  const router = new RegExpRouter<PreparedRoute>();

  registerManifestRoutes(router, manifest, basePath);

  function dispatchRequest(request: Request): Promise<Response | undefined> | Response | undefined {
    const pathname = extractPathname(request.url);
    const method = request.method as HttpMethod;
    const matchResult = router.match(method, pathname);
    const firstMatch = matchResult?.[0]?.[0];
    const match = firstMatch
      ? (() => {
          const [preparedRoute, paramLabels] = firstMatch;
          const values = matchResult[1] ?? [];
          const params: Record<string, string> = {};
          const entries = getParamEntries(paramLabels);
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]!;
            const value = values[entry[1]];
            if (value !== undefined && value !== null) {
              params[entry[0]] = value;
            }
          }
          return { data: preparedRoute as PreparedRoute, params };
        })()
      : undefined;

    if (!match) {
      if (!notFoundHandler) {
        return undefined;
      }
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

    try {
      const ctxResult = buildPipelineContext(
        request,
        params,
        pathname,
        prepared.method,
        createContext,
        cookieSecret,
        cookieDefaults,
      );

      if (isPromise(ctxResult)) {
        return ctxResult
          .then(async (resolvedCtx) => {
            ctx = resolvedCtx;
            const runResult = prepared.run(ctx);
            const result = isPromise(runResult) ? await runResult : runResult;
            return finalizeReply(
              result,
              prepared.effectiveReturns,
              responseOptions,
              request,
              getCookiesFromContext(ctx),
            );
          })
          .catch((error) =>
            handleRouteError(error, {
              effectiveReturns: prepared.effectiveReturns,
              responseOptions,
              cookies: getCookiesFromContext(ctx),
              cookieSecret,
              cookieDefaults,
              ctx,
              request,
              onErrorHandler,
            }),
          );
      }

      ctx = ctxResult;
      const runResult = prepared.run(ctx);

      if (isPromise(runResult)) {
        return runResult
          .then((result) =>
            finalizeReply(
              result,
              prepared.effectiveReturns,
              responseOptions,
              request,
              getCookiesFromContext(ctx),
            ),
          )
          .catch((error) =>
            handleRouteError(error, {
              effectiveReturns: prepared.effectiveReturns,
              responseOptions,
              cookies: getCookiesFromContext(ctx),
              cookieSecret,
              cookieDefaults,
              ctx,
              request,
              onErrorHandler,
            }),
          );
      }

      return finalizeReply(
        runResult,
        prepared.effectiveReturns,
        responseOptions,
        request,
        getCookiesFromContext(ctx),
      );
    } catch (error) {
      return handleRouteError(error, {
        effectiveReturns: prepared.effectiveReturns,
        responseOptions,
        cookies: getCookiesFromContext(ctx),
        cookieSecret,
        cookieDefaults,
        ctx,
        request,
        onErrorHandler,
      });
    }
  }

  const runtime: TaserRuntime<any> = {
    fetch(request) {
      return dispatchRequest(request);
    },
    request(path, init) {
      const url =
        path.startsWith("http://") || path.startsWith("https://")
          ? path
          : `http://localhost${path.startsWith("/") ? "" : "/"}${path}`;
      const req = new Request(url, init);
      return Promise.resolve(dispatchRequest(req));
    },
    onError(handler: OnErrorHandler | OnErrorHandler["handle"]) {
      onErrorHandler = normalizeOnError(handler);
      return runtime;
    },
    notFound(handler) {
      notFoundHandler = handler;
      return runtime as TaserRuntime<true>;
    },
  };

  return runtime as TaserRuntime<TOptions extends { notFound: NotFoundHandler } ? true : false>;
}
