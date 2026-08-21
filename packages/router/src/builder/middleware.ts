import type { LayoutId, MiddlewareBuilder } from "../types/index.js";
import type { MiddlewareDefinition } from "../types/units.js";

export function createMiddleware<const Layout extends LayoutId>(
  layout: Layout,
): MiddlewareBuilder<Layout, readonly []> {
  const entries: MiddlewareDefinition[] = [];
  let metadata: Record<string, unknown> = {};

  const chain = {
    layout,
    middlewares: entries,
    meta(metaObj: Record<string, unknown>) {
      if (typeof metaObj === "object" && metaObj !== null && !Array.isArray(metaObj)) {
        metadata = { ...metadata, ...metaObj };
        if (entries.length > 0) {
          const last = entries[entries.length - 1];
          if (last) {
            last.metadata = { ...last.metadata, ...metaObj };
          }
        }
      }
      return chain;
    },
    use(definition: MiddlewareDefinition) {
      if (Object.keys(metadata).length > 0 && !definition.metadata) {
        definition.metadata = { ...metadata };
      }
      entries.push(definition);
      return chain;
    },
  };

  return chain as unknown as MiddlewareBuilder<Layout, readonly []>;
}
