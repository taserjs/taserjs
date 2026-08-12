export { errorReply } from './errors.js'
export { successReply } from './success.js'
export {
  createReplyResult,
  isReplyResult,
  ReplyResult,
} from './result.js'
export type { ReplyBodyKind, ReplyOf, SuccessReplyData } from './result.js'
export type { BinaryBody, BodyKind, FileReplyInit, ReplyInit } from './types.js'
export { ensureReplyResult } from './ensure.js'

import { errorReply } from './errors.js'
import { successReply } from './success.js'

export const reply = {
  ...successReply,
  ...errorReply,
}
