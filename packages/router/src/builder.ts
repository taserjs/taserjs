import type {
  HttpMethod,
  LayoutDefinition,
  MiddlewareHandler,
  RouteDefinition,
  RouteHandler,
} from "./types.js";

type MiddlewareInput = MiddlewareHandler | { handler: MiddlewareHandler };

function appendMiddlewares(target: MiddlewareHandler[], inputs: MiddlewareInput[]): void {
  for (const mw of inputs) {
    if (typeof mw === "function") {
      target.push(mw);
    } else if (mw && typeof mw.handler === "function") {
      target.push(mw.handler);
    }
  }
}

export class LayoutBuilder<TPath extends string = string> implements LayoutDefinition<TPath> {
  readonly kind = "layout" as const;
  public readonly path?: TPath | undefined;
  public readonly middlewares: MiddlewareHandler[] = [];

  constructor(path?: TPath | undefined) {
    this.path = path;
  }

  use(...middlewares: MiddlewareInput[]): this {
    appendMiddlewares(this.middlewares, middlewares);
    return this;
  }
}

export class RouteBuilder<TPath extends string = string> {
  public readonly middlewares: MiddlewareHandler[] = [];

  constructor(
    public readonly method: HttpMethod,
    public readonly path: TPath,
  ) {}

  use(...middlewares: MiddlewareInput[]): this {
    appendMiddlewares(this.middlewares, middlewares);
    return this;
  }

  handler(fn: RouteHandler): RouteDefinition<TPath> {
    return {
      kind: "route",
      method: this.method,
      path: this.path,
      middlewares: [...this.middlewares],
      handler: fn,
    };
  }
}

export const t = {
  get: <TPath extends string>(path: TPath) => new RouteBuilder("GET", path),
  post: <TPath extends string>(path: TPath) => new RouteBuilder("POST", path),
  put: <TPath extends string>(path: TPath) => new RouteBuilder("PUT", path),
  delete: <TPath extends string>(path: TPath) => new RouteBuilder("DELETE", path),
  patch: <TPath extends string>(path: TPath) => new RouteBuilder("PATCH", path),
  layout: <TPath extends string = string>(path?: TPath | undefined) => new LayoutBuilder(path),
};
