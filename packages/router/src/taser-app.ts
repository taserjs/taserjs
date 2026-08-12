import type { TaserRuntime } from '@taserjs/router-core'
import type { RouteManifestShape } from '@taserjs/router-core'

class TaserServeView {
  constructor(protected readonly runtime: TaserRuntime) { }

  fetch(request: Request, env?: unknown, executionCtx?: unknown): Promise<Response> {
    return this.runtime.fetch(request, env, executionCtx as never)
  }

  native(native: unknown): TaserNativeBound {
    return new TaserNativeBound(this.runtime, native)
  }
}

export class TaserNativeBound {
  constructor(
    private readonly runtime: TaserRuntime,
    private readonly boundNative: unknown,
  ) { }

  fetch(request: Request, env?: unknown, executionCtx?: unknown): Promise<Response> {
    return this.runtime.native(this.boundNative).fetch(request, env, executionCtx as never)
  }
}

export class TaserMountedApp extends TaserServeView { }

export class TaserApp<TManifest extends RouteManifestShape = RouteManifestShape> extends TaserServeView {
  readonly __manifest?: TManifest

  constructor(runtime: TaserRuntime, manifest?: TManifest) {
    super(runtime)
    if (manifest !== undefined) {
      this.__manifest = manifest
    }
  }

  base(prefix: string): TaserMountedApp {
    this.runtime.registerRoutePrefix(prefix)
    return new TaserMountedApp(this.runtime)
  }
}
