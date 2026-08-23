import {
  STATUS_ACCEPTED,
  STATUS_CREATED,
  STATUS_FOUND,
  STATUS_OK,
  TEXT_HTML,
} from "../http/constants.js";
import {
  buildBodyResponse,
  jsonResponse,
  mergeHeaders,
  noContentResponse,
  toReplyResponse,
} from "./build.js";
import { validateRedirectLocation } from "./redirect-location.js";
import type { ReplyOf } from "./result.js";
import type { RedirectInit, ReplyInit } from "./types.js";

export function ok(body?: unknown, init?: ReplyInit) {
  return buildBodyResponse(body, init);
}

export function created<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<201, T> {
  return buildBodyResponse(body, { ...init, status: init?.status ?? STATUS_CREATED }) as ReplyOf<
    201,
    T
  >;
}

export function accepted<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<202, T> {
  return buildBodyResponse(body, { ...init, status: init?.status ?? STATUS_ACCEPTED }) as ReplyOf<
    202,
    T
  >;
}

export function json<T>(data: T): ReplyOf<200, T>;
export function json<T, const S extends number>(
  data: T,
  init: Omit<ReplyInit, "status"> & { status: S },
): ReplyOf<S, T>;
export function json<T>(data: T, init?: ReplyInit): ReplyOf<number, T>;
export function json<T>(data: T, init?: ReplyInit): ReplyOf<number, T> {
  if (init === undefined) {
    return jsonResponse(data) as ReplyOf<number, T>;
  }
  return jsonResponse(data, { ...init, status: init.status ?? STATUS_OK }) as ReplyOf<number, T>;
}

export function text(body: string): ReplyOf<200, string>;
export function text<const S extends number>(
  body: string,
  init: Omit<ReplyInit, "status"> & { status: S },
): ReplyOf<S, string>;
export function text(body: string, init?: ReplyInit): ReplyOf<number, string>;
export function text(body: string, init?: ReplyInit): ReplyOf<number, string> {
  if (init === undefined) {
    return toReplyResponse(body, mergeHeaders(undefined, "string"), body, "text") as ReplyOf<
      number,
      string
    >;
  }
  const statusInit = { ...init, status: init.status ?? STATUS_OK };
  return toReplyResponse(body, mergeHeaders(statusInit, "string"), body, "text") as ReplyOf<
    number,
    string
  >;
}

export function html(body: string): ReplyOf<200, string>;
export function html<const S extends number>(
  body: string,
  init: Omit<ReplyInit, "status"> & { status: S },
): ReplyOf<S, string>;
export function html(body: string, init?: ReplyInit): ReplyOf<number, string>;
export function html(body: string, init?: ReplyInit): ReplyOf<number, string> {
  if (init === undefined) {
    return toReplyResponse(
      body,
      mergeHeaders(undefined, "empty", { contentType: TEXT_HTML }),
      body,
      "text",
    ) as ReplyOf<number, string>;
  }
  const statusInit = { ...init, status: init.status ?? STATUS_OK };
  return toReplyResponse(
    body,
    mergeHeaders(statusInit, "empty", { contentType: TEXT_HTML }),
    body,
    "text",
  ) as ReplyOf<number, string>;
}

export function noContent(init?: ReplyInit): ReplyOf<204, null> {
  return noContentResponse(init);
}

export function redirect(location: string): ReplyOf<302, string>;
export function redirect<const S extends number>(
  location: string,
  init: Omit<RedirectInit, "status"> & { status: S },
): ReplyOf<S, string>;
export function redirect(location: string, init?: RedirectInit): ReplyOf<number, string>;
export function redirect(location: string, init?: RedirectInit): ReplyOf<number, string> {
  validateRedirectLocation(location, init?.allowExternal);
  const statusInit = { ...init, status: init?.status ?? STATUS_FOUND };
  const headers = new Headers(mergeHeaders(statusInit, "empty").headers);
  if (!headers.has("location")) {
    headers.set("location", location);
  }
  return toReplyResponse(null, { ...statusInit, headers }, location, "redirect") as ReplyOf<
    number,
    string
  >;
}
