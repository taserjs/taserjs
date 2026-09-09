import type { Client, ClientRequestOptions, ClientResponse, CreateClientOptions } from "./types.js";
import {
  applyPathParams,
  buildSearchParams,
  clientMethodToHttp,
  isClientMethod,
  joinUrl,
  resolveHeaders,
  type HeaderValue,
} from "./url.js";

async function executeRequest(
  options: CreateClientOptions,
  segments: string[],
  methodKey: string,
  args: unknown[],
): Promise<ClientResponse<any>> {
  const input = (args[0] ?? {}) as {
    query?: Record<string, unknown>;
    param?: Record<string, unknown>;
    body?: unknown;
    headers?: HeaderValue;
  };
  const requestOptions = (args[1] ?? {}) as ClientRequestOptions;

  const pathSegments = applyPathParams(segments, input.param);
  const baseUrl = options.baseUrl ?? "";
  const queryString = buildSearchParams(input.query);
  const url = `${joinUrl(baseUrl, pathSegments)}${queryString}`;
  const method = clientMethodToHttp(methodKey);

  const resolvedHeaders = await resolveHeaders(
    options.headers,
    requestOptions.headers,
    input.headers,
  );

  let body: BodyInit | undefined;
  const hasContentType = Object.keys(resolvedHeaders).some(
    (k) => k.toLowerCase() === "content-type",
  );

  if (method !== "GET" && method !== "HEAD" && input.body !== undefined) {
    if (input.body instanceof FormData) {
      body = input.body;
      // Let fetch set multipart/form-data boundary automatically
    } else if (input.body instanceof URLSearchParams) {
      body = input.body;
      if (!hasContentType) {
        resolvedHeaders["Content-Type"] = "application/x-www-form-urlencoded";
      }
    } else if (
      typeof input.body === "string" ||
      input.body instanceof Blob ||
      input.body instanceof ArrayBuffer ||
      ArrayBuffer.isView(input.body)
    ) {
      body = input.body as BodyInit;
    } else {
      body = JSON.stringify(input.body);
      if (!hasContentType) {
        resolvedHeaders["Content-Type"] = "application/json";
      }
    }
  }

  const fetchImpl = requestOptions.fetch ?? options.fetch ?? globalThis.fetch;
  const init: RequestInit = {
    ...requestOptions.init,
    method,
    headers: resolvedHeaders,
  };
  if (body !== undefined) {
    init.body = body;
  }

  const onRequest = requestOptions.onRequest ?? options.onRequest;
  const onResponse = requestOptions.onResponse ?? options.onResponse;

  if (onRequest) {
    const intercepted = await onRequest(new Request(url, init));
    if (intercepted instanceof Response) {
      return intercepted;
    }
    if (intercepted instanceof Request) {
      let res = await fetchImpl(intercepted);
      if (onResponse) {
        const interceptedRes = await onResponse(res, intercepted);
        if (interceptedRes instanceof Response) return interceptedRes;
      }
      return res;
    }
  }

  let res = await fetchImpl(url, init);
  if (onResponse) {
    const interceptedRes = await onResponse(res, new Request(url, init));
    if (interceptedRes instanceof Response) return interceptedRes;
  }
  return res;
}

export function createClient<TApp = never>(options: CreateClientOptions = {}): Client<TApp> {
  const normalizedBaseUrl = (options.baseUrl ?? "").replace(/\/+$/, "");
  const clientOptions: CreateClientOptions = {
    ...options,
    baseUrl: normalizedBaseUrl,
  };

  function callback(path: string[], args: unknown[]): unknown {
    const methodKey = path[path.length - 1];

    if (!methodKey || !isClientMethod(methodKey)) {
      throw new Error(`Invalid client method path: ${path.join(".")}`);
    }

    const segments = path.slice(0, -1);
    return executeRequest(clientOptions, segments, methodKey, args);
  }

  function createProxy(path: string[]): unknown {
    const childCache = new Map<string, unknown>();

    return new Proxy(() => {}, {
      get(_target, prop) {
        if (typeof prop !== "string" || prop === "then") {
          return undefined;
        }
        let child = childCache.get(prop);
        if (child === undefined) {
          child = createProxy([...path, prop]);
          childCache.set(prop, child);
        }
        return child;
      },
      apply(_target, _thisArg, args) {
        return callback(path, args);
      },
    });
  }

  return createProxy([]) as Client<TApp>;
}
