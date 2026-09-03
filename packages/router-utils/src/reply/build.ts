import {
  APPLICATION_JSON,
  APPLICATION_OCTET_STREAM,
  DEFAULT_HEADERS_BY_BODY_KIND,
  ERROR_MESSAGES,
  STATUS_NO_CONTENT,
  STATUS_OK,
  TEXT_HTML,
  TEXT_PLAIN,
} from "../http/constants.js";
import type { BinaryBody, BodyKind, ReplyInit } from "./types.js";
import { createReply, type ReplyBodyKind, type ReplyOf } from "./result.js";

export const DEFAULT_JSON_HEADERS = Object.freeze({ "content-type": APPLICATION_JSON });
export const DEFAULT_TEXT_HEADERS = Object.freeze({ "content-type": TEXT_PLAIN });
export const DEFAULT_HTML_HEADERS = Object.freeze({ "content-type": TEXT_HTML });

export function mergeHeaders(
  init: ReplyInit | undefined,
  kind: BodyKind,
  dynamic?: { contentType?: string },
): ReplyInit {
  const defaults = DEFAULT_HEADERS_BY_BODY_KIND[kind];
  const defaultContentType = defaults?.["content-type"] ?? dynamic?.contentType;

  if (!init || !init.headers) {
    const headers = defaultContentType ? { "content-type": defaultContentType } : {};
    return init ? { ...init, headers } : { headers };
  }

  const rawHeaders = init.headers;
  if (rawHeaders instanceof Headers) {
    const headers = new Headers(rawHeaders);
    if (defaultContentType && !headers.has("content-type")) {
      headers.set("content-type", defaultContentType);
    }
    return { ...init, headers };
  }

  if (Array.isArray(rawHeaders)) {
    const headers = new Headers(rawHeaders);
    if (defaultContentType && !headers.has("content-type")) {
      headers.set("content-type", defaultContentType);
    }
    return { ...init, headers };
  }

  // Plain object Record<string, string>
  let hasContentType = false;
  for (const k in rawHeaders) {
    if (k.toLowerCase() === "content-type") {
      hasContentType = true;
      break;
    }
  }
  const headers =
    hasContentType || !defaultContentType
      ? { ...rawHeaders }
      : { "content-type": defaultContentType, ...rawHeaders };

  return { ...init, headers };
}

export function toBodyBytes(data: BinaryBody): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

/**
 * Converts a body into a web ReadableStream. Web streams pass through;
 * Node.js streams require the converter registered by importing
 * `@taserjs/router-utils/stream` (kept out of this module so `reply` stays
 * universal — zero node builtins).
 */
export function toWebReadableStream(body: ReadableStream): ReadableStream {
  if (body instanceof ReadableStream) {
    return body;
  }
  const streamLike = body as { on?: unknown; pipe?: unknown };
  if (typeof streamLike?.on === "function" && typeof streamLike?.pipe === "function") {
    if (nodeStreamConverter) {
      return nodeStreamConverter(body);
    }
    throw new TypeError(
      "[taser] Node.js streams in replies require importing '@taserjs/router-utils/stream' " +
        "(registers the converter) or passing Readable.toWeb(stream) instead.",
    );
  }
  throw new TypeError("[taser] Unsupported stream body: expected a ReadableStream");
}

type NodeStreamConverter = (stream: unknown) => ReadableStream;
let nodeStreamConverter: NodeStreamConverter | undefined;

/** Registers the Node.js stream converter (called by the `./stream` subpath). */
export function registerNodeStreamConverter(converter: NodeStreamConverter): void {
  nodeStreamConverter = converter;
}

export function classifyBody(body: unknown): BodyKind {
  if (body === undefined) {
    return "empty";
  }

  if (body === null) {
    return "null";
  }

  if (typeof body === "string") {
    return "string";
  }

  if (
    (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) ||
    body instanceof Uint8Array ||
    body instanceof ArrayBuffer
  ) {
    return "bytes";
  }

  if (body instanceof Blob) {
    return "blob";
  }

  if (body instanceof ReadableStream) {
    return "stream";
  }

  if (typeof body === "object" && body !== null) {
    // Duck-typed Node.js Readable (avoids importing node:stream here).
    const candidate = body as { on?: unknown; pipe?: unknown };
    if (typeof candidate.on === "function" && typeof candidate.pipe === "function") {
      return "stream";
    }
  }

  if (body instanceof FormData) {
    return "formData";
  }

  if (body instanceof URLSearchParams) {
    return "urlSearchParams";
  }

  return "json";
}

function bodyKindToReplyKind(kind: BodyKind): ReplyBodyKind {
  switch (kind) {
    case "empty":
    case "null":
      return "empty";
    case "string":
      return "text";
    case "json":
      return "json";
    case "bytes":
      return "binary";
    case "blob":
      return "blob";
    case "stream":
      return "stream";
    case "formData":
      return "formData";
    case "urlSearchParams":
      return "text";
    default:
      return "json";
  }
}

export function toReplyResponse(
  body: BodyInit | null,
  init: ReplyInit | undefined,
  data: unknown,
  kind: ReplyBodyKind,
): Response {
  if (init === undefined) {
    return createReply(body, undefined, data, kind);
  }
  const status = init.status ?? STATUS_OK;
  const responseInit: ResponseInit = {
    status,
    ...(init.statusText !== undefined ? { statusText: init.statusText } : {}),
    ...(init.headers !== undefined ? { headers: init.headers } : {}),
  };
  return createReply(body, responseInit, data, kind);
}

export function jsonResponse(data: unknown, init?: ReplyInit): Response {
  if (!init) {
    return createReply(
      JSON.stringify(data),
      { status: STATUS_OK, headers: DEFAULT_JSON_HEADERS },
      data,
      "json",
    );
  }
  const status = init.status ?? STATUS_OK;
  if (!init.headers) {
    return createReply(
      JSON.stringify(data),
      { ...init, status, headers: DEFAULT_JSON_HEADERS },
      data,
      "json",
    );
  }
  return toReplyResponse(JSON.stringify(data), mergeHeaders(init, "json"), data, "json");
}

export function buildBodyResponse(body: unknown, init?: ReplyInit): Response {
  const kind = classifyBody(body);
  const statusInit = { ...init, status: init?.status ?? STATUS_OK };
  const replyKind = bodyKindToReplyKind(kind);

  switch (kind) {
    case "empty":
    case "null":
      return toReplyResponse(null, mergeHeaders(statusInit, kind), body ?? null, replyKind);

    case "string":
      return toReplyResponse(body as string, mergeHeaders(statusInit, kind), body, replyKind);

    case "json":
      return toReplyResponse(JSON.stringify(body), mergeHeaders(statusInit, kind), body, replyKind);

    case "bytes":
      return toReplyResponse(
        toBodyBytes(body as BinaryBody) as BodyInit,
        mergeHeaders(statusInit, kind),
        body,
        replyKind,
      );

    case "blob": {
      const blob = body as Blob;
      return toReplyResponse(
        blob,
        mergeHeaders(statusInit, kind, {
          contentType: blob.type || APPLICATION_OCTET_STREAM,
        }),
        body,
        replyKind,
      );
    }

    case "stream":
      return toReplyResponse(
        toWebReadableStream(body as ReadableStream),
        mergeHeaders(statusInit, kind),
        null,
        replyKind,
      );

    case "formData":
      return toReplyResponse(body as FormData, mergeHeaders(statusInit, kind), body, replyKind);

    case "urlSearchParams":
      return toReplyResponse(
        body as URLSearchParams,
        mergeHeaders(statusInit, kind),
        (body as URLSearchParams).toString(),
        replyKind,
      );

    default:
      return toReplyResponse(JSON.stringify(body), mergeHeaders(statusInit, "json"), body, "json");
  }
}

export function buildErrorResponse(
  body: unknown | undefined,
  status: number,
  init?: ReplyInit,
): Response {
  const payload = body ?? { error: ERROR_MESSAGES[status] ?? ERROR_MESSAGES[0] };
  return buildBodyResponse(payload, { ...init, status });
}

export function noContentResponse(init?: ReplyInit): ReplyOf<204, null> {
  return toReplyResponse(
    null,
    { ...init, status: init?.status ?? STATUS_NO_CONTENT },
    null,
    "empty",
  ) as ReplyOf<204, null>;
}
