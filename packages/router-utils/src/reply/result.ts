import type { SuccessStatusCode } from "../http/status.js";

export type ReplyBodyKind =
  | "json"
  | "text"
  | "empty"
  | "binary"
  | "stream"
  | "redirect"
  | "blob"
  | "formData";

export const REPLY_DATA = Symbol.for("taser.reply.data");
export const REPLY_KIND = Symbol.for("taser.reply.kind");

/**
 * Phantom-typed Web Response carrying static status and body types.
 * Pure Web-standard Response at runtime.
 */
export type ReplyOf<S extends number = number, B = unknown> = Response & {
  readonly status: S;
  readonly data: B;
};

/**
 * Union of reply bodies for success statuses (`Response.ok` / 2xx).
 * Distributes over `ReplyOf` unions; non-success and bare `Response` contribute `never`.
 */
export type SuccessReplyData<R> =
  R extends ReplyOf<infer S, infer B> ? (S extends SuccessStatusCode ? B : never) : never;

export function createReply<S extends number, B>(
  body: BodyInit | null,
  init: ResponseInit | undefined,
  data: B,
  kind: ReplyBodyKind,
): ReplyOf<S, B> {
  const res = new Response(body, init) as ReplyOf<S, B>;
  (res as unknown as Record<symbol, unknown>)[REPLY_DATA] = data;
  (res as unknown as Record<symbol, unknown>)[REPLY_KIND] = kind;
  return res;
}
