import type { LayoutId, MiddlewareBuilder } from "../types/index.js";
import type { MiddlewareDefinition } from "../types/units.js";
import { normalizeMiddlewareDefinition } from "./normalize.js";

class MiddlewareBuilderImpl<Layout extends LayoutId> {
  readonly layout: Layout;
  readonly middlewares: MiddlewareDefinition[] = [];

  constructor(layout: Layout) {
    this.layout = layout;
  }

  use(definition: MiddlewareDefinition | ((ctx: any, next: any) => any)): this {
    this.middlewares.push(normalizeMiddlewareDefinition(definition));
    return this;
  }
}

export function createMiddleware<const Layout extends LayoutId>(
  layout: Layout,
): MiddlewareBuilder<Layout, readonly []> {
  return new MiddlewareBuilderImpl(layout) as unknown as MiddlewareBuilder<Layout, readonly []>;
}
