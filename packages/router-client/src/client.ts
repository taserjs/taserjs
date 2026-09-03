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

function hasHeader(headers: Record<string, string>, target: string): boolean {
  const lower = target.toLowerCase();
  for (const k in headers) {
    if (k.toLowerCase() === lower) return true;
  }
  return false;
}

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

  const resolvedHeaders = resolveHeaders(options.headers, requestOptions.headers);
  const headers = resolvedHeaders instanceof Promise ? await resolvedHeaders : resolvedHeaders;
  let body: BodyInit | undefined;

  const hasContentType = hasHeader(headers, "content-type");

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

export function createClient<TApp = never>(options: CreateClientOptions): Client<TApp> {
  const normalizedBaseUrl = options.baseUrl.endsWith("/")
    ? options.baseUrl.replace(/\/+$/, "")
    : options.baseUrl;
  const clientOptions: CreateClientOptions =
    normalizedBaseUrl === options.baseUrl ? options : { ...options, baseUrl: normalizedBaseUrl };

  function callback(opts: CallbackOptions): unknown {
    const parts = opts.path;
    const methodKey = parts[parts.length - 1];

    if (!methodKey || !isClientMethod(methodKey)) {
      throw new Error(`Invalid client method path: ${parts.join(".")}`);
    }

    const segments = parts.slice(0, -1);
    return executeRequest(clientOptions, segments, methodKey, opts.args);
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
        return callback({ path, args });
      },
    });
  }

  return createProxy([]) as Client<TApp>;
}
