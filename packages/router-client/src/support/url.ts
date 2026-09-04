import type { ClientMethodKey } from "@taserjs/router-utils";
import { CLIENT_METHODS, CLIENT_TO_HTTP } from "../constants/methods.js";

export function isClientMethod(key: string): boolean {
  return CLIENT_METHODS.has(key);
}

export function clientMethodToHttp(method: string): string {
  return CLIENT_TO_HTTP[method as ClientMethodKey] ?? method.slice(1).toUpperCase();
}

export function decodeClientSegment(segment: string): string {
  if (segment === "_splat" || segment.startsWith("_")) {
    return segment;
  }
  if (segment.startsWith("$")) {
    return `.${segment.slice(1).replaceAll("_", "-")}`;
  }
  return segment.replaceAll("_", "-");
}

export function joinUrl(baseUrl: string, segments: string[]): string {
  const base = baseUrl.endsWith("/") ? baseUrl.replace(/\/+$/, "") : baseUrl;
  const decoded = segments.filter((segment) => segment.length > 0).map(decodeClientSegment);
  const path = decoded.join("/");
  if (path === "") {
    return `${base}/`;
  }
  return `${base}/${path}`;
}

export function applyPathParams(
  segments: string[],
  param: Record<string, string> | undefined,
): string[] {
  if (!param) {
    return segments;
  }

  return segments.map((segment) => {
    if (segment === "_splat") {
      const value = param._splat;
      if (value === undefined) {
        throw new Error('Missing path param "_splat"');
      }
      return encodeURIComponent(value);
    }
    if (segment.startsWith("_")) {
      const name = segment.slice(1);
      const value = param[name];
      if (value === undefined) {
        throw new Error(`Missing path param "${name}"`);
      }
      return encodeURIComponent(value);
    }
    return segment;
  });
}

export function buildSearchParams(query: Record<string, unknown> | undefined): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  for (const key in query) {
    const value = query[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          params.append(key, String(item));
        }
      }
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params.set(key, String(value));
    }
  }

  const serialized = params.toString();
  return serialized === "" ? "" : `?${serialized}`;
}

export function resolveHeaders(
  ...sources: Array<
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
    | undefined
  >
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
      if (source) {
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
      if (resolved) {
        Object.assign(result, resolved);
      }
    }
    return result;
  })();
}
