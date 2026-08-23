import type { Client, ClientRequestOptions, ClientResponse, CreateClientOptions } from "./types.js";
import {
  applyPathParams,
  buildSearchParams,
  clientMethodToHttp,
  isClientMethod,
  joinUrl,
  resolveHeaders,
} from "./support/url.js";

type CallbackOptions = {
  path: string[];
  args: unknown[];
};

async function executeRequest(
  options: CreateClientOptions,
  segments: string[],
  methodKey: string,
  args: unknown[],
): Promise<ClientResponse> {
  const input = (args[0] ?? {}) as {
    query?: Record<string, unknown>;
    param?: Record<string, string>;
    body?: unknown;
  };
  const requestOptions = (args[1] ?? {}) as ClientRequestOptions;

  const pathSegments = applyPathParams(segments, input.param);
  const url = `${joinUrl(options.baseUrl, pathSegments)}${buildSearchParams(input.query)}`;
  const method = clientMethodToHttp(methodKey);

  const headers = await resolveHeaders(options.headers, requestOptions.headers);
  let body: BodyInit | undefined;

  const hasContentType = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");

  if (method !== "GET" && method !== "HEAD" && input.body !== undefined) {
    if (input.body instanceof FormData) {
      body = input.body;
    } else if (input.body instanceof URLSearchParams) {
      body = input.body;
      if (!hasContentType) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    } else if (
      typeof input.body === "string" ||
      input.body instanceof Blob ||
      input.body instanceof ArrayBuffer
    ) {
      body = input.body as BodyInit;
    } else {
      body = JSON.stringify(input.body);
      if (!hasContentType) {
        headers["Content-Type"] = "application/json";
      }
    }
  }

  const fetchImpl = requestOptions.fetch ?? options.fetch ?? globalThis.fetch;
  const init: RequestInit = {
    ...requestOptions.init,
    method,
    headers,
  };
  if (body !== undefined) {
    init.body = body;
  }

  const response = await fetchImpl(url, init);

  return response;
}

export function createClient<TApp>(options: CreateClientOptions): Client<TApp> {
  const proxyCache = new Map<string, unknown>();

  function createProxy(path: string[]): unknown {
    const key = path.join(".");
    const cached = proxyCache.get(key);
    if (cached) {
      return cached;
    }

    const proxy: unknown = new Proxy(() => {}, {
      get(_target, prop) {
        if (typeof prop !== "string" || prop === "then") {
          return undefined;
        }
        return createProxy([...path, prop]);
      },
      apply(_target, _thisArg, args) {
        return callback({ path, args });
      },
    });
    proxyCache.set(key, proxy);
    return proxy;
  }

  function callback(opts: CallbackOptions): unknown {
    const parts = [...opts.path];
    const methodKey = parts.at(-1);

    if (!methodKey || !isClientMethod(methodKey)) {
      throw new Error(`Invalid client method path: ${parts.join(".")}`);
    }

    const segments = parts.slice(0, -1);
    return executeRequest(options, segments, methodKey, opts.args);
  }

  return createProxy([]) as Client<TApp>;
}
