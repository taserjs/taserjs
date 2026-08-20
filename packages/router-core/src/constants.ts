export const RESERVED_CONTEXT_KEYS = [
  "state",
  "query",
  "params",
  "body",
  /** Parsed request headers (read-only). Not schema-validated. */
  "headers",
  /** Parsed request cookies. Not schema-validated. */
  "cookies",
  "method",
  "path",
  "url",
  "request",
  "hono",
  "var",
] as const;

export type ReservedContextKey = (typeof RESERVED_CONTEXT_KEYS)[number];
