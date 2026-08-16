import type { SuccessStatusCode } from "../http-status.js";

export type ReplyBodyKind =
  | "json"
  | "text"
  | "empty"
  | "binary"
  | "stream"
  | "redirect"
  | "blob"
  | "formData";

/**
 * Typed reply carrier that extends the Web Response.
 * Structured body lives on `data` for output validation — never re-parse the stream.
 * Call {@link ReplyResult.getResponse} before handing off to framework adapters.
 *
 * `data` / `kind` are non-enumerable so accidental JSON.stringify (or Hono treating a
 * failed `instanceof Response` as a plain object) cannot emit an envelope body.
 */
export class ReplyResult extends Response {
  readonly data!: unknown;
  readonly kind!: ReplyBodyKind;

  constructor(
    body: BodyInit | null,
    init: ResponseInit | undefined,
    data: unknown,
    kind: ReplyBodyKind,
  ) {
    super(body, init);
    Object.defineProperty(this, "data", {
      value: data,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(this, "kind", {
      value: kind,
      enumerable: false,
      writable: false,
      configurable: false,
    });
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
