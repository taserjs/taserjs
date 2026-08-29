import type { LayoutId, MiddlewareBuilder } from "../types/index.js";
import type { MiddlewareDefinition } from "../types/units.js";

export function createMiddleware<const Layout extends LayoutId>(
  layout: Layout,
): MiddlewareBuilder<Layout, readonly []> {
  const entries: MiddlewareDefinition[] = [];

  const chain = {
    layout,
    middlewares: entries,
    use(definition: MiddlewareDefinition | ((ctx: any, next: any) => any)) {
      if (typeof definition === "function") {
        entries.push({ handler: definition as any });
      } else {
        entries.push(definition);
      }
      return chain;
    },
  };

  return chain as unknown as MiddlewareBuilder<Layout, readonly []>;
}
