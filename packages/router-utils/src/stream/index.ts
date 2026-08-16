import { createReadStream } from 'node:fs'
import { lookup } from 'mrmime'

import { APPLICATION_OCTET_STREAM, STATUS_OK } from '../constants.js'
import {
  mergeHeaders,
  toBodyBytes,
  toReplyResult,
  toWebReadableStream,
} from '../reply/build.js'
import { resolveSafeFilePath } from '../reply/safe-path.js'
import type { ReplyOf } from '../reply/result.js'
import type { BinaryBody, FileReplyInit, ReplyInit } from '../reply/types.js'

function pipe(
  body: ReadableStream | NodeJS.ReadableStream,
): ReplyOf<200, null>
function pipe<const S extends number>(
  body: ReadableStream | NodeJS.ReadableStream,
  init: Omit<ReplyInit, 'status'> & { status: S },
): ReplyOf<S, null>
function pipe(
  body: ReadableStream | NodeJS.ReadableStream,
  init?: ReplyInit,
): ReplyOf<number, null>
function pipe(
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
  return toReplyResult(
    value,
    mergeHeaders(statusInit, 'blob', {
      contentType: value.type || APPLICATION_OCTET_STREAM,
    }),
    value,
    'blob',
  ) as ReplyOf<number, Blob>
}

function file(path: string): ReplyOf<200, string>
function file<const S extends number>(
  path: string,
  init: Omit<FileReplyInit, 'status'> & { status: S },
): ReplyOf<S, string>
function file(path: string, init?: FileReplyInit): ReplyOf<number, string>
function file(path: string, init?: FileReplyInit): ReplyOf<number, string> {
  const safePath = resolveSafeFilePath(path, init?.root)
  const lookedUp = lookup(safePath)
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

export const stream = {
  pipe,
  buffer,
  blob,
  file,
}

export { pipe, buffer, blob, file }
