import { jsonResponse, noContentResponse } from './build.js'
import {
  createReplyResult,
  isReplyResult,
  type ReplyResult,
} from './result.js'

/**
 * Coerce any pipeline node output to ReplyResult.
 * Bare Response without data is wrapped as opaque empty-kind with null data.
 */
export function ensureReplyResult(value: unknown): ReplyResult {
  if (isReplyResult(value)) {
    return value
  }

  if (value instanceof Response) {
    return createReplyResult(
      value.body,
      {
        status: value.status,
        statusText: value.statusText,
        headers: value.headers,
      },
      null,
      value.body ? 'stream' : 'empty',
    )
  }

  if (value === undefined || value === null) {
    return noContentResponse()
  }

  return jsonResponse(value)
}
