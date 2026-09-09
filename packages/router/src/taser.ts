import type {
  ContextDefinition,
  ContextOptions,
  InferAppContext,
  NotFoundHandler,
  OnErrorHandler,
  TaserAppOptions,
  TaserDefinition,
} from "./types.js";

export class TaserBuilder<TContext = Record<string, unknown>>
  implements TaserDefinition<TContext>
{
  readonly _context?: TContext;
  public readonly options: TaserAppOptions<any> = {};

  basePath(path: string): this {
    this.options.basePath = path;
    return this;
  }

  context<TCtxDef extends ContextOptions<any, any> | ContextDefinition<any, any>>(
    ctxDef: TCtxDef,
  ): TaserBuilder<InferAppContext<TCtxDef>> {
    this.options.context = ctxDef;
    return this as unknown as TaserBuilder<InferAppContext<TCtxDef>>;
  }

  notFound(fn: NotFoundHandler<TContext>): this {
    this.options.notFound = fn;
    return this;
  }

  onError(fn: OnErrorHandler): this {
    this.options.onError = fn;
    return this;
  }
}

export function defineTaser<TContext = Record<string, unknown>>(): TaserBuilder<TContext> {
  return new TaserBuilder<TContext>();
}
