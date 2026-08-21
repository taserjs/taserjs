export type OpenApiRouteDoc = {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  externalDocs?: {
    description?: string;
    url: string;
  };
};

export const DOC_SYMBOL = Symbol.for("taser.openapi.doc");

export type WithDocMeta<T> = T & {
  readonly [DOC_SYMBOL]?: OpenApiRouteDoc;
};

/**
 * Attaches OpenAPI documentation metadata (summary, description, tags, etc.)
 * to a route or middleware object without modifying core Taser builders.
 */
export function withDoc<T extends object>(doc: OpenApiRouteDoc, target: T): WithDocMeta<T> {
  Object.defineProperty(target, DOC_SYMBOL, {
    value: doc,
    writable: false,
    enumerable: false,
    configurable: true,
  });
  return target as WithDocMeta<T>;
}

export function getRouteDoc(target: unknown): OpenApiRouteDoc | undefined {
  if (typeof target === "object" && target !== null && DOC_SYMBOL in target) {
    return (target as any)[DOC_SYMBOL] as OpenApiRouteDoc;
  }
  return undefined;
}
