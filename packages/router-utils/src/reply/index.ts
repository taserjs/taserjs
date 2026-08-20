export { errorReply } from "./errors.js";
export { successReply } from "./success.js";
export { createReply, REPLY_DATA, REPLY_KIND } from "./result.js";
export type { ReplyBodyKind, ReplyOf, SuccessReplyData } from "./result.js";
export type { BinaryBody, BodyKind, FileReplyInit, RedirectInit, ReplyInit } from "./types.js";
export { ensureResponse } from "./ensure.js";

import { errorReply } from "./errors.js";
import { successReply } from "./success.js";

export const reply = {
  ...successReply,
  ...errorReply,
};
