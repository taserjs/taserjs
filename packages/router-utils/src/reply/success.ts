import {
  STATUS_ACCEPTED,
  STATUS_CREATED,
  STATUS_FOUND,
  STATUS_OK,
  TEXT_HTML,
} from "../constants.js";
import {
  buildBodyResponse,
  jsonResponse,
  mergeHeaders,
  noContentResponse,
  toReplyResult,
} from "./build.js";
import { validateRedirectLocation } from "./redirect-location.js";
import { blob, buffer, file, pipe } from "../stream/index.js";
import type { ReplyOf } from "./result.js";
import type { RedirectInit, ReplyInit } from "./types.js";

function ok(body?: unknown, init?: ReplyInit) {
  return buildBodyResponse(body, init);
}

function created<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<201, T> {
  return buildBodyResponse(body, { ...init, status: init?.status ?? STATUS_CREATED }) as ReplyOf<
    201,
    T
  >;
}

function accepted<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<202, T> {
  return buildBodyResponse(body, { ...init, status: init?.status ?? STATUS_ACCEPTED }) as ReplyOf<
    202,
    T
  >;
}

function json<T>(data: T): ReplyOf<200, T>;
function json<T, const S extends number>(
  data: T,
  init: Omit<ReplyInit, "status"> & { status: S },
): ReplyOf<S, T>;
function json<T>(data: T, init?: ReplyInit): ReplyOf<number, T>;
function json<T>(data: T, init?: ReplyInit): ReplyOf<number, T> {
  return jsonResponse(data, { ...init, status: init?.status ?? STATUS_OK }) as ReplyOf<number, T>;
}

function text(body: string): ReplyOf<200, string>;
function text<const S extends number>(
  body: string,
  init: Omit<ReplyInit, "status"> & { status: S },
): ReplyOf<S, string>;
function text(body: string, init?: ReplyInit): ReplyOf<number, string>;
function text(body: string, init?: ReplyInit): ReplyOf<number, string> {
  const statusInit = { ...init, status: init?.status ?? STATUS_OK };
  return toReplyResult(body, mergeHeaders(statusInit, "string"), body, "text") as ReplyOf<
    number,
    string
  >;
}

function html(body: string): ReplyOf<200, string>;
function html<const S extends number>(
  body: string,
  init: Omit<ReplyInit, "status"> & { status: S },
): ReplyOf<S, string>;
function html(body: string, init?: ReplyInit): ReplyOf<number, string>;
function html(body: string, init?: ReplyInit): ReplyOf<number, string> {
  const statusInit = { ...init, status: init?.status ?? STATUS_OK };
  return toReplyResult(
    body,
    mergeHeaders(statusInit, "empty", { contentType: TEXT_HTML }),
    body,
    "text",
  ) as ReplyOf<number, string>;
}

function noContent(init?: ReplyInit): ReplyOf<204, null> {
  return noContentResponse(init);
}

function redirect(location: string): ReplyOf<302, string>;
function redirect<const S extends number>(
  location: string,
  init: Omit<RedirectInit, "status"> & { status: S },
): ReplyOf<S, string>;
function redirect(location: string, init?: RedirectInit): ReplyOf<number, string>;
function redirect(location: string, init?: RedirectInit): ReplyOf<number, string> {
  validateRedirectLocation(location, init?.allowExternal);
  const statusInit = { ...init, status: init?.status ?? STATUS_FOUND };
  const headers = new Headers(mergeHeaders(statusInit, "empty").headers);
  if (!headers.has("location")) {
    headers.set("location", location);
  }
  return toReplyResult(null, { ...statusInit, headers }, location, "redirect") as ReplyOf<
    number,
    string
  >;
}

const stream = pipe;

export const successReply = {
  ok,
  created,
  accepted,
  json,
  text,
  html,
  noContent,
  redirect,
  buffer,
  blob,
  stream,
  file,
};
