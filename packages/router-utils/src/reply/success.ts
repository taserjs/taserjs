import { createReadStream } from 'node:fs'

import mime from 'mime-types'

import { APPLICATION_OCTET_STREAM, STATUS_FOUND, STATUS_OK } from '../constants.js'
import {
  buildBodyResponse,
  jsonResponse,
  mergeHeaders,
  noContentResponse,
  toBodyBytes,
  toReplyResult,
  toWebReadableStream,
} from './build.js'
import { validateRedirectLocation } from './redirect-location.js'
import { resolveSafeFilePath } from './safe-path.js'
import type { ReplyOf } from './result.js'
import type { BinaryBody, FileReplyInit, RedirectInit, ReplyInit } from './types.js'

function ok(body?: unknown, init?: ReplyInit) {
  return buildBodyResponse(body, init)
}

function json<T>(data: T): ReplyOf<200, T>
function json<T, const S extends number>(
  data: T,
  init: Omit<ReplyInit, 'status'> & { status: S },
): ReplyOf<S, T>
function json<T>(data: T, init?: ReplyInit): ReplyOf<number, T>
function json<T>(data: T, init?: ReplyInit): ReplyOf<number, T> {
  return jsonResponse(data, { ...init, status: init?.status ?? STATUS_OK }) as ReplyOf<number, T>
}

function text(body: string): ReplyOf<200, string>
function text<const S extends number>(
  body: string,
  init: Omit<ReplyInit, 'status'> & { status: S },
): ReplyOf<S, string>
function text(body: string, init?: ReplyInit): ReplyOf<number, string>
function text(body: string, init?: ReplyInit): ReplyOf<number, string> {
  const statusInit = { ...init, status: init?.status ?? STATUS_OK }
  return toReplyResult(body, mergeHeaders(statusInit, 'string'), body, 'text') as ReplyOf<
    number,
    string
  >
}

function noContent(init?: ReplyInit): ReplyOf<204, null> {
  return noContentResponse(init)
}

function redirect(location: string): ReplyOf<302, string>
function redirect<const S extends number>(
  location: string,
  init: Omit<RedirectInit, 'status'> & { status: S },
): ReplyOf<S, string>
function redirect(location: string, init?: RedirectInit): ReplyOf<number, string>
function redirect(location: string, init?: RedirectInit): ReplyOf<number, string> {
  validateRedirectLocation(location, init?.allowExternal)
  const statusInit = { ...init, status: init?.status ?? STATUS_FOUND }
  const headers = new Headers(mergeHeaders(statusInit, 'empty').headers)
  if (!headers.has('location')) {
    headers.set('location', location)
  }
  return toReplyResult(null, { ...statusInit, headers }, location, 'redirect') as ReplyOf<
    number,
    string
  >
}

function buffer(data: BinaryBody): ReplyOf<200, BinaryBody>
function buffer<const S extends number>(
  data: BinaryBody,
  init: Omit<ReplyInit, 'status'> & { status: S },
): ReplyOf<S, BinaryBody>
function buffer(data: BinaryBody, init?: ReplyInit): ReplyOf<number, BinaryBody>
function buffer(data: BinaryBody, init?: ReplyInit): ReplyOf<number, BinaryBody> {
  const statusInit = { ...init, status: init?.status ?? STATUS_OK }
  return toReplyResult(
    toBodyBytes(data) as BodyInit,
    mergeHeaders(statusInit, 'bytes'),
    data,
    'binary',
  ) as ReplyOf<number, BinaryBody>
}

function blob(value: Blob): ReplyOf<200, Blob>
function blob<const S extends number>(
  value: Blob,
  init: Omit<ReplyInit, 'status'> & { status: S },
): ReplyOf<S, Blob>
function blob(value: Blob, init?: ReplyInit): ReplyOf<number, Blob>
function blob(value: Blob, init?: ReplyInit): ReplyOf<number, Blob> {
  const statusInit = { ...init, status: init?.status ?? STATUS_OK }
  return toReplyResult(value, mergeHeaders(statusInit, 'blob', {
    contentType: value.type || APPLICATION_OCTET_STREAM,
  }), value, 'blob') as ReplyOf<number, Blob>
}

function stream(
  body: ReadableStream | NodeJS.ReadableStream,
): ReplyOf<200, null>
function stream<const S extends number>(
  body: ReadableStream | NodeJS.ReadableStream,
  init: Omit<ReplyInit, 'status'> & { status: S },
): ReplyOf<S, null>
function stream(
  body: ReadableStream | NodeJS.ReadableStream,
  init?: ReplyInit,
): ReplyOf<number, null>
function stream(
  body: ReadableStream | NodeJS.ReadableStream,
  init?: ReplyInit,
): ReplyOf<number, null> {
  const statusInit = { ...init, status: init?.status ?? STATUS_OK }
  return toReplyResult(
    toWebReadableStream(body),
    mergeHeaders(statusInit, 'stream'),
    null,
    'stream',
  ) as ReplyOf<number, null>
}

function file(path: string): ReplyOf<200, string>
function file<const S extends number>(
  path: string,
  init: Omit<FileReplyInit, 'status'> & { status: S },
): ReplyOf<S, string>
function file(path: string, init?: FileReplyInit): ReplyOf<number, string>
function file(path: string, init?: FileReplyInit): ReplyOf<number, string> {
  const safePath = resolveSafeFilePath(path, init?.root)
  const lookedUp = mime.lookup(safePath)
  const contentType = init?.contentType ?? (lookedUp || undefined)
  const statusInit = { ...init, status: init?.status ?? STATUS_OK }
  const mergedInit = mergeHeaders(statusInit, 'stream', {
    contentType: contentType || APPLICATION_OCTET_STREAM,
  })
  return toReplyResult(
    toWebReadableStream(createReadStream(safePath)),
    mergedInit,
    safePath,
    'stream',
  ) as ReplyOf<number, string>
}

export const successReply = {
  ok,
  json,
  text,
  noContent,
  redirect,
  buffer,
  blob,
  stream,
  file,
}
