import { Readable } from 'node:stream'

import {
  APPLICATION_OCTET_STREAM,
  DEFAULT_HEADERS_BY_BODY_KIND,
  ERROR_MESSAGES,
  STATUS_NO_CONTENT,
  STATUS_OK,
} from '../constants.js'
import type { BinaryBody, BodyKind, ReplyInit } from './types.js'
import {
  createReplyResult,
  type ReplyBodyKind,
  type ReplyOf,
  type ReplyResult,
} from './result.js'

export function mergeHeaders(
  init: ReplyInit | undefined,
  kind: BodyKind,
  dynamic?: { contentType?: string },
): ReplyInit {
  const defaults = DEFAULT_HEADERS_BY_BODY_KIND[kind]
  const defaultHeaders = defaults
    ? { ...defaults }
    : dynamic?.contentType
      ? { 'content-type': dynamic.contentType }
      : {}

  const headers = new Headers(defaultHeaders)

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value)
    })
  }

  return { ...init, headers }
}

export function toBodyBytes(data: BinaryBody): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

export function toWebReadableStream(body: ReadableStream | NodeJS.ReadableStream): ReadableStream {
  return (body instanceof ReadableStream) ? body : Readable.toWeb(body) as ReadableStream
}

export function classifyBody(body: unknown): BodyKind {
  if (body === undefined) {
    return 'empty'
  }

  if (body === null) {
    return 'null'
  }

  if (typeof body === 'string') {
    return 'string'
  }

  if (Buffer.isBuffer(body) || body instanceof Uint8Array || body instanceof ArrayBuffer) {
    return 'bytes'
  }

  if (body instanceof Blob) {
    return 'blob'
  }

  if (body instanceof ReadableStream) {
    return 'stream'
  }

  if (typeof body === 'object' && body !== null && Readable.isReadable(body as NodeJS.ReadableStream)) {
    return 'stream'
  }

  if (body instanceof FormData) {
    return 'formData'
  }

  if (body instanceof URLSearchParams) {
    return 'urlSearchParams'
  }

  return 'json'
}

function bodyKindToReplyKind(kind: BodyKind): ReplyBodyKind {
  switch (kind) {
    case 'empty':
    case 'null':
      return 'empty'
    case 'string':
      return 'text'
    case 'json':
      return 'json'
    case 'bytes':
      return 'binary'
    case 'blob':
      return 'blob'
    case 'stream':
      return 'stream'
    case 'formData':
      return 'formData'
    case 'urlSearchParams':
      return 'text'
    default:
      return 'json'
  }
}

export function toReplyResult(
  body: BodyInit | null,
  init: ReplyInit | undefined,
  data: unknown,
  kind: ReplyBodyKind,
): ReplyResult {
  const status = init?.status ?? STATUS_OK
  const headers = new Headers(init?.headers)
  return createReplyResult(body, { ...init, status, headers }, data, kind)
}

export function jsonResponse(data: unknown, init?: ReplyInit): ReplyResult {
  const statusInit = { ...init, status: init?.status ?? STATUS_OK }
  return toReplyResult(
    JSON.stringify(data),
    mergeHeaders(statusInit, 'json'),
    data,
    'json',
  )
}

export function buildBodyResponse(body: unknown, init?: ReplyInit): ReplyResult {
  const kind = classifyBody(body)
  const statusInit = { ...init, status: init?.status ?? STATUS_OK }
  const replyKind = bodyKindToReplyKind(kind)

  switch (kind) {
    case 'empty':
    case 'null':
      return toReplyResult(null, mergeHeaders(statusInit, kind), body ?? null, replyKind)

    case 'string':
      return toReplyResult(body as string, mergeHeaders(statusInit, kind), body, replyKind)

    case 'json':
      return toReplyResult(JSON.stringify(body), mergeHeaders(statusInit, kind), body, replyKind)

    case 'bytes':
      return toReplyResult(
        toBodyBytes(body as BinaryBody) as BodyInit,
        mergeHeaders(statusInit, kind),
        body,
        replyKind,
      )

    case 'blob': {
      const blob = body as Blob
      return toReplyResult(blob, mergeHeaders(statusInit, kind, {
        contentType: blob.type || APPLICATION_OCTET_STREAM,
      }), body, replyKind)
    }

    case 'stream':
      return toReplyResult(
        toWebReadableStream(body as ReadableStream | NodeJS.ReadableStream),
        mergeHeaders(statusInit, kind),
        null,
        replyKind,
      )

    case 'formData':
      return toReplyResult(body as FormData, mergeHeaders(statusInit, kind), body, replyKind)

    case 'urlSearchParams':
      return toReplyResult(
        body as URLSearchParams,
        mergeHeaders(statusInit, kind),
        (body as URLSearchParams).toString(),
        replyKind,
      )

    default:
      return toReplyResult(JSON.stringify(body), mergeHeaders(statusInit, 'json'), body, 'json')
  }
}

export function buildErrorResponse(
  body: unknown | undefined,
  status: number,
  init?: ReplyInit,
): ReplyResult {
  const payload = body ?? { error: ERROR_MESSAGES[status] ?? ERROR_MESSAGES[0] }
  return buildBodyResponse(payload, { ...init, status })
}

export function noContentResponse(init?: ReplyInit): ReplyOf<204, null> {
  return toReplyResult(
    null,
    { ...init, status: init?.status ?? STATUS_NO_CONTENT },
    null,
    'empty',
  ) as ReplyOf<204, null>
}
