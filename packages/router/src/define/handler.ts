import type { HandlerBuilder } from "../types/index.js";
import type {
  AppContext,
  HandlerUnit,
  MiddlewareDefinition,
  ReturnsMap,
  ValidatorParts,
} from "../types/units.js";
import type { Schema } from "../types/schema.js";
import { pickDefinedSchemas, type SchemaValidators } from "./validators.js";
import { collectReturnsFromDefinitions } from "@taserjs/router-utils";

function createHandlerBuilder<TAppContext extends Record<string, unknown> = AppContext>(
  validators: SchemaValidators,
  middlewares: MiddlewareDefinition[],
  returnsMap: ReturnsMap,
): HandlerBuilder<readonly [], ValidatorParts, {}, TAppContext> {
  const builder = {
    returns(map: ReturnsMap) {
      return createHandlerBuilder<TAppContext>(validators, middlewares, { ...returnsMap, ...map });
    },
    use(unitOrOptions: MiddlewareDefinition) {
      middlewares.push(unitOrOptions);
      return builder;
    },
    handler(fn: (ctx: unknown) => unknown) {
      const mwReturns = collectReturnsFromDefinitions(middlewares);
      const mergedReturns = { ...mwReturns, ...returnsMap };
      const unit = {
        $Infer: { Output: undefined as unknown as Response },
        middlewares: [...middlewares],
        handler: fn as HandlerUnit<readonly [], ValidatorParts>["handler"],
        ...pickDefinedSchemas(validators),
        ...(Object.keys(mergedReturns).length > 0 ? { returns: mergedReturns } : {}),
      } as HandlerUnit<readonly [], ValidatorParts>;
      return unit;
    },
  };

  return builder as unknown as HandlerBuilder<readonly [], ValidatorParts, {}, TAppContext>;
}

export function defineHandler<
  TAppContext extends Record<string, unknown> = AppContext,
>(): HandlerBuilder<readonly [], {}, {}, TAppContext>;

export function defineHandler<
  TAppContext extends Record<string, unknown> = AppContext,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
>(options: {
  query?: Schema<TQuery>;
  params?: Schema<TParams>;
  body?: Schema<TBody>;
}): HandlerBuilder<readonly [], { query: TQuery; params: TParams; body: TBody }, {}, TAppContext>;

export function defineHandler<TAppContext extends Record<string, unknown> = AppContext>(
  options?: SchemaValidators,
): HandlerBuilder<readonly [], ValidatorParts, {}, TAppContext> {
  return createHandlerBuilder<TAppContext>(options ?? {}, [], {});
}
