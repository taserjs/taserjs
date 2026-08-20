import type { RouteManifestShape, TaserRuntime } from "@taserjs/router-core";

class TaserServeView {
  readonly fetch: (
    request: Request,
    env?: unknown,
    executionCtx?: unknown,
  ) => Promise<Response> | Response;

  constructor(protected readonly runtime: TaserRuntime) {
    this.fetch = (request: Request, env?: unknown, executionCtx?: unknown) => {
      return this.runtime.fetch(request, env, executionCtx as never);
    };
  }
}

export class TaserApp<
  TManifest extends RouteManifestShape = RouteManifestShape,
> extends TaserServeView {
  readonly __manifest?: TManifest;

  constructor(runtime: TaserRuntime, manifest?: TManifest) {
    super(runtime);
    if (manifest !== undefined) {
      this.__manifest = manifest;
    }
  }
}
