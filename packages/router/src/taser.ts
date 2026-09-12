import type {
  ContextDefinition,
  NotFoundHandler,
  OnErrorHandler,
  ResponseOptions,
  TaserAppOptions,
  TaserDefinition,
} from "./types.js";

export class TaserBuilder<TContext = Record<string, unknown>> implements TaserDefinition<TContext> {
  readonly _context?: TContext;
  declare readonly $Infer: {
    Context: TContext;
  };
  public readonly options: TaserAppOptions<any>;

  constructor(options?: TaserAppOptions<any>) {
    this.options = options ? { ...options } : {};
  }

  basePath(path: string): this {
    this.options.basePath = path;
    return this;
  }

  response(options: ResponseOptions): this {
    this.options.response = { ...this.options.response, ...options };
    return this;
  }

  context<
    TBoot extends Record<string, unknown> = Record<string, unknown>,
    TRequest extends Record<string, unknown> = Record<string, unknown>,
  >(ctxDef: ContextDefinition<TBoot, TRequest>): TaserBuilder<TBoot & TRequest> {
    this.options.context = ctxDef;
    return this as unknown as TaserBuilder<TBoot & TRequest>;
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

export function defineTaser<TContext = Record<string, unknown>>(
  options?: TaserAppOptions<TContext>,
): TaserBuilder<TContext> {
  return new TaserBuilder<TContext>(options);
}
