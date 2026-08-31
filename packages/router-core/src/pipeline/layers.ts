import type { StandardSchemaV1 } from "@standard-schema/spec";
import { validateSchema } from "@taserjs/router-utils";

import { ensureBody } from "../http/ensure-body.js";
import type {
  MiddlewareDefinition,
  PipelineContext,
  PipelineLayer,
  PipelineNext,
  RouteHandler,
  RouteManifestShape,
} from "../types.js";
import { getMiddlewares } from "./returns.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function mergeValidatedField(
  schema: StandardSchemaV1,
  current: unknown,
): Promise<unknown> {
  const valueToValidate = current ?? {};
  const validated = await validateSchema(schema, valueToValidate);
  if (isRecord(current) && isRecord(validated)) {
    return { ...current, ...validated };
  }
  return validated;
}

async function applyRouteSchemas(route: RouteHandler, ctx: PipelineContext): Promise<void> {
  if (route.query !== undefined) {
    ctx.query = (await mergeValidatedField(route.query as StandardSchemaV1, ctx.query)) as Record<
      string,
      unknown
    >;
  }
  if (route.params !== undefined) {
    ctx.params = (await mergeValidatedField(
      route.params as StandardSchemaV1,
      ctx.params,
    )) as Record<string, unknown>;
  }
  if (route.body !== undefined) {
    await ensureBody(ctx, route.bodyMode);
    ctx.body = await mergeValidatedField(route.body as StandardSchemaV1, ctx.body);
  }
}

async function applyValidators(
  ctx: PipelineContext,
  definition: MiddlewareDefinition,
): Promise<void> {
  if (definition.query !== undefined) {
    ctx.query = (await mergeValidatedField(
      definition.query as StandardSchemaV1,
      ctx.query,
    )) as Record<string, unknown>;
  }
  if (definition.params !== undefined) {
    ctx.params = (await mergeValidatedField(
      definition.params as StandardSchemaV1,
      ctx.params,
    )) as Record<string, unknown>;
  }
  if (definition.body !== undefined) {
    await ensureBody(ctx, definition.bodyMode);
    ctx.body = await mergeValidatedField(definition.body as StandardSchemaV1, ctx.body);
  }
}

export function middlewareToLayer(definition: MiddlewareDefinition): PipelineLayer {
  const hasSchemas =
    definition.query !== undefined ||
    definition.params !== undefined ||
    definition.body !== undefined;

  return {
    async run(ctx, next) {
      if (hasSchemas) {
        await applyValidators(ctx, definition);
      }

      if (!definition.handler) {
        return next();
      }

      let nextCalled = false;
      const trackedNext: PipelineNext = (args) => {
        nextCalled = true;
        return next(args);
      };

      const out = await definition.handler(ctx, trackedNext);
      if ((out === undefined || out === null) && !nextCalled) {
        return next();
      }
      return out;
    },
  };
}

export function schemaLayer(apply: (ctx: PipelineContext) => Promise<void>): PipelineLayer {
  return {
    async run(ctx, next) {
      await apply(ctx);
      return next();
    },
  };
}

export function buildPipelineLayers(
  manifest: RouteManifestShape,
  layouts: readonly string[],
  route: RouteHandler,
): PipelineLayer[] {
  const layers: PipelineLayer[] = [];

  for (const layoutId of layouts) {
    const layout = manifest.layouts[layoutId];
    if (!layout) {
      continue;
    }
    for (const definition of getMiddlewares(layout)) {
      layers.push(middlewareToLayer(definition));
    }
  }

  for (const definition of route.middlewares ?? []) {
    layers.push(middlewareToLayer(definition));
  }

  if (route.query !== undefined || route.params !== undefined || route.body !== undefined) {
    layers.push(schemaLayer((ctx) => applyRouteSchemas(route, ctx)));
  }

  return layers;
}
