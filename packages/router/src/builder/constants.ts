/** Input schema keys validated by middleware and route handlers. Headers/cookies are parsed only. */
export const SCHEMA_KEYS = ["query", "params", "body"] as const;

export type SchemaKey = (typeof SCHEMA_KEYS)[number];
