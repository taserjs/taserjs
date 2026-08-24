import type { RouteManifestShape, TaserRuntime } from "@taserjs/router-core";

export class TaserServeView<THasNotFound extends boolean = boolean> {
  readonly fetch: (
    request: Request,
    env?: unknown,
    executionCtx?: unknown,
  ) => THasNotFound extends true
    ? Promise<Response> | Response
    : Promise<Response | undefined> | Response | undefined;

  readonly request: (
    path: string,
    init?: RequestInit,
  ) => THasNotFound extends true
    ? Promise<Response>
    : Promise<Response | undefined>;

  constructor(protected readonly runtime: TaserRuntime<THasNotFound>) {
    this.fetch = (request: Request, env?: unknown, executionCtx?: unknown) => {
      return this.runtime.fetch(request, env, executionCtx as never);
    };
    this.request = (path: string, init?: RequestInit) => {
      return this.runtime.request(path, init);
    };
  }
}

export class TaserApp<
  TManifest extends RouteManifestShape = RouteManifestShape,
  THasNotFound extends boolean = boolean,
> extends TaserServeView<THasNotFound> {
  readonly __manifest?: TManifest;

  constructor(runtime: TaserRuntime<THasNotFound>, manifest?: TManifest) {
    super(runtime);
    if (manifest !== undefined) {
      this.__manifest = manifest;
    }
  }
}
