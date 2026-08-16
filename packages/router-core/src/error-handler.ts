import { isReplyResult, reply } from "@taserjs/router-utils";

/** True for Web Responses even after global.Response is replaced (e.g. @hono/node-server). */
function isResponseLike(value: unknown): value is Response {
  if (isReplyResult(value) || value instanceof Response) {
    return true;
  }
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Response).arrayBuffer === "function" &&
    typeof (value as Response).status === "number" &&
    typeof (value as Response).headers === "object"
  );
}

/** Stage 2: strip ReplyResult subclass before handing to Hono/adapters. */
export function toWireResponse(response: Response): Response {
  return isReplyResult(response) ? response.getResponse() : response;
}

export function handlePipelineError(error: unknown): Response {
  if (isResponseLike(error)) {
    return error;
  }

  if (error instanceof Error) {
    console.error(error);
  } else {
    console.error("Unhandled pipeline error", error);
  }

  return reply.internalServerError();
}

/**
 * Stage 1: coerce pipeline output to Response, preserving ReplyResult for validateReply.
 * Must check ReplyResult before `instanceof Response`: @hono/node-server replaces
 * global.Response, which makes ReplyResult fail that check and otherwise get
 * JSON-serialized via reply.json (the { data, kind } envelope bug).
 */
export function toResponse(value: unknown): Response {
  if (isReplyResult(value)) {
    return value;
  }

  if (value instanceof Response) {
    return value;
  }

  if (isResponseLike(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return reply.noContent();
  }

  return reply.json(value);
}
