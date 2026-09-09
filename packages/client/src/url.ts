import { CLIENT_METHODS, CLIENT_TO_HTTP, type ClientMethodKey } from "./constants.js";

export function isClientMethod(key: string): boolean {
  return CLIENT_METHODS.has(key);
}

export function clientMethodToHttp(method: string): string {
  return CLIENT_TO_HTTP[method as ClientMethodKey] ?? method.replace(/^\$/, "").toUpperCase();
}

export function decodeClientSegment(segment: string): string {
  if (segment === "_splat" || segment === "*" || segment.startsWith(":") || segment.startsWith("_")) {
    return segment;
  }
  if (segment.startsWith("$")) {
    return `.${segment.slice(1).replaceAll("_", "-")}`;
  }
  return segment.replaceAll("_", "-");
}

export function joinUrl(baseUrl: string, segments: string[]): string {
  const base = baseUrl.replace(/\/+$/, "");
  const path = segments
    .flatMap((s) => s.split("/"))
    .filter((s) => s.length > 0)
    .join("/");

  if (path === "") {
    return base === "" ? "/" : `${base}/`;
  }
  return base === "" ? `/${path}` : `${base}/${path}`;
}

export function applyPathParams(
  segments: string[],
  param: Record<string, unknown> | undefined,
): string[] {
  const flattened = segments
    .flatMap((s) => s.split("/"))
    .filter((s) => s.length > 0);

  return flattened.map((segment) => {
    if (segment === "_splat" || segment === "*") {
      const val = param?._splat ?? param?.["*"];
      if (val === undefined || val === null) {
        throw new Error('Missing path param "_splat"');
      }
      return encodeURIComponent(String(val));
    }
    if (segment.startsWith("_") || segment.startsWith(":")) {
      const name = segment.slice(1);
      const val = param?.[name];
      if (val === undefined || val === null) {
        throw new Error(`Missing path param "${name}"`);
      }
      return encodeURIComponent(String(val));
    }
    return decodeClientSegment(segment);
  });
}

export function buildSearchParams(query: Record<string, unknown> | undefined): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  for (const key of Object.keys(query)) {
    const val = query[key];
    if (val === undefined || val === null) {
      continue;
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item === undefined || item === null) continue;
        if (item instanceof Date) {
          params.append(key, item.toISOString());
        } else {
          params.append(key, String(item));
        }
      }
    } else if (val instanceof Date) {
      params.set(key, val.toISOString());
    } else {
      params.set(key, String(val));
    }
  }

  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

export type HeaderValue =
  | Record<string, string>
  | (() => Record<string, string> | Promise<Record<string, string>>);

export function resolveHeaders(
  ...sources: Array<HeaderValue | undefined>
): Promise<Record<string, string>> | Record<string, string> {
  let hasFn = false;
  for (const s of sources) {
    if (typeof s === "function") {
      hasFn = true;
      break;
    }
  }

  if (!hasFn) {
    const result: Record<string, string> = {};
    for (const source of sources) {
      if (source && typeof source === "object") {
        Object.assign(result, source);
      }
    }
    return result;
  }

  return (async () => {
    const resolvedSources = await Promise.all(
      sources.map(async (source) => {
        if (!source) return undefined;
        if (typeof source === "function") {
          return source();
        }
        return source;
      }),
    );
    const result: Record<string, string> = {};
    for (const resolved of resolvedSources) {
      if (resolved && typeof resolved === "object") {
        Object.assign(result, resolved);
      }
    }
    return result;
  })();
}
