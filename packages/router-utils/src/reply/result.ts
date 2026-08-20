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
 * Typed reply carrier that extends the Web Response.
 * Structured body lives on `data` for output validation — never re-parse the stream.
 * Call {@link ReplyResult.getResponse} before handing off to framework adapters.
 *
 * `data` / `kind` are stored as Symbols so accidental JSON.stringify (or Hono treating a
 * failed `instanceof Response` as a plain object) cannot emit an envelope body.
 */
export class ReplyResult extends Response {
  [REPLY_DATA]: unknown;
  [REPLY_KIND]: ReplyBodyKind;

  constructor(
    body: BodyInit | null,
    init: ResponseInit | undefined,
    data: unknown,
    kind: ReplyBodyKind,
  ) {
    super(body, init);
    this[REPLY_DATA] = data;
    this[REPLY_KIND] = kind;
  }

  get data(): unknown {
    return this[REPLY_DATA];
  }

  get kind(): ReplyBodyKind {
    return this[REPLY_KIND];
  }

  toJSON(): Record<string, never> {
    return {};
  }

  /** Plain Response for adapter/framework boundaries (no ReplyResult identity). */
  getResponse(): Response {
    return new Response(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  }
}

/** Phantom-typed ReplyResult for status + body inference. */
export type ReplyOf<S extends number = number, B = unknown> = ReplyResult & {
  readonly status: S;
  readonly data: B;
};

/**
 * Union of reply bodies for success statuses (`Response.ok` / 2xx).
 * Distributes over `ReplyOf` unions; non-success and bare `Response` contribute `never`.
 */
export type SuccessReplyData<R> =
  R extends ReplyOf<infer S, infer B> ? (S extends SuccessStatusCode ? B : never) : never;

export function isReplyResult(value: unknown): value is ReplyResult {
  return value instanceof ReplyResult;
}

export function createReplyResult<S extends number, B>(
  body: BodyInit | null,
  init: ResponseInit | undefined,
  data: B,
  kind: ReplyBodyKind,
): ReplyOf<S, B> {
  return new ReplyResult(body, init, data, kind) as ReplyOf<S, B>;
}
