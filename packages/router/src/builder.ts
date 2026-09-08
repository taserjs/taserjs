import type { HttpMethod, RouteDefinition, RouteHandler } from "./types.js";

export class RouteBuilder<TPath extends string = string> {
  constructor(
    public readonly method: HttpMethod,
    public readonly path: TPath,
  ) {}

  handler(fn: RouteHandler): RouteDefinition<TPath> {
    return {
      kind: "route",
      method: this.method,
      path: this.path,
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
};
