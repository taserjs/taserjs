import type { RouteManifestShape, TaserRuntime } from "@taserjs/router-core";

export class TaserServeView<TPassThrough extends boolean = boolean> {
  readonly fetch: (
    request: Request,
    env?: unknown,
    executionCtx?: unknown,
  ) => TPassThrough extends true
    ? Promise<Response | undefined> | Response | undefined
    : Promise<Response> | Response;

  constructor(protected readonly runtime: TaserRuntime<TPassThrough>) {
    this.fetch = (request: Request, env?: unknown, executionCtx?: unknown) => {
      return this.runtime.fetch(request, env, executionCtx as never);
    };
  }
}

export class TaserApp<
  TManifest extends RouteManifestShape = RouteManifestShape,
  TPassThrough extends boolean = boolean,
> extends TaserServeView<TPassThrough> {
  readonly __manifest?: TManifest;

  constructor(runtime: TaserRuntime<TPassThrough>, manifest?: TManifest) {
    super(runtime);
    if (manifest !== undefined) {
      this.__manifest = manifest;
    }
  }
}
