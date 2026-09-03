import type { LayoutId, MiddlewareBuilder } from "../types/index.js";
import type { MiddlewareDefinition } from "../types/units.js";

class MiddlewareBuilderImpl<Layout extends LayoutId> {
  readonly layout: Layout;
  readonly middlewares: MiddlewareDefinition[] = [];

  constructor(layout: Layout) {
    this.layout = layout;
  }

  use(definition: MiddlewareDefinition | ((ctx: any, next: any) => any)): this {
    if (typeof definition === "function") {
      this.middlewares.push({ handler: definition as any });
    } else if (typeof (definition as any)?.toUnit === "function") {
      this.middlewares.push((definition as any).toUnit());
    } else {
      this.middlewares.push(definition);
    }
    return this;
  }
}

export function createMiddleware<const Layout extends LayoutId>(
  layout: Layout,
): MiddlewareBuilder<Layout, readonly []> {
  return new MiddlewareBuilderImpl(layout) as unknown as MiddlewareBuilder<Layout, readonly []>;
}
