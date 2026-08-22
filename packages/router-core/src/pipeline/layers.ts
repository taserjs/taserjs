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

async function validateOptionalSchema(schema: unknown, value: unknown): Promise<unknown> {
  if (schema === undefined) {
    return value;
  }
  return mergeValidatedField(schema as StandardSchemaV1, value);
}

async function applyRouteSchemas(
  route: RouteHandler,
  ctx: PipelineContext,
  prefix: "route" | "handler",
): Promise<void> {
  const query = prefix === "route" ? route.query : route.handlerQuery;
  const params = prefix === "route" ? route.params : route.handlerParams;
  const body = prefix === "route" ? route.body : route.handlerBody;
  const bodyMode = prefix === "route" ? route.bodyMode : route.handlerBodyMode;

  ctx.query = (await validateOptionalSchema(query, ctx.query)) as Record<string, unknown>;
  ctx.params = (await validateOptionalSchema(params, ctx.params)) as Record<string, unknown>;
  if (body !== undefined) {
    await ensureBody(ctx, bodyMode);
    ctx.body = await validateOptionalSchema(body, ctx.body);
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
  layoutChain: readonly string[],
  route: RouteHandler,
): PipelineLayer[] {
  const layers: PipelineLayer[] = [];

  for (const layoutId of layoutChain) {
    const layout = manifest.layouts[layoutId];
    if (!layout) {
      continue;
    }
    for (const definition of getMiddlewares(layout.middlewares)) {
      layers.push(middlewareToLayer(definition));
    }
  }

  for (const definition of route.middlewares ?? []) {
    layers.push(middlewareToLayer(definition));
  }

  if (route.query !== undefined || route.params !== undefined || route.body !== undefined) {
    layers.push(schemaLayer((ctx) => applyRouteSchemas(route, ctx, "route")));
  }

  for (const definition of route.handlerMiddlewares ?? []) {
    layers.push(middlewareToLayer(definition));
  }

  if (
    route.handlerQuery !== undefined ||
    route.handlerParams !== undefined ||
    route.handlerBody !== undefined
  ) {
    layers.push(schemaLayer((ctx) => applyRouteSchemas(route, ctx, "handler")));
  }

  return layers;
}
