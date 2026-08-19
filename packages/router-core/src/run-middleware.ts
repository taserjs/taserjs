import type { StandardSchemaV1 } from "@standard-schema/spec";
import { ensureReplyResult, type ReplyResult, validateSchema } from "@taserjs/router-utils";

import { ensureBody } from "./ensure-body.js";
import type { MiddlewareDefinition } from "./types.js";

export type PipelineContext = Record<string, unknown> & {
  state: Record<string, unknown>;
};

export type PipelineNext = (state?: Record<string, unknown>) => Promise<ReplyResult>;

export type PipelineLayer = {
  run: (ctx: PipelineContext, next: PipelineNext) => Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate against a schema and merge defined keys back into the current value. */
export async function mergeValidatedField(
  schema: StandardSchemaV1,
  current: unknown,
): Promise<unknown> {
  const validated = await validateSchema(schema, current);
  if (isRecord(current) && isRecord(validated)) {
    return { ...current, ...validated };
  }
  return validated;
}

async function applyValidators(
  ctx: PipelineContext,
  definition: MiddlewareDefinition,
): Promise<void> {
  if (definition.query !== undefined) {
    ctx.query = await mergeValidatedField(definition.query as StandardSchemaV1, ctx.query);
  }
  if (definition.params !== undefined) {
    ctx.params = await mergeValidatedField(definition.params as StandardSchemaV1, ctx.params);
  }
  if (definition.body !== undefined) {
    await ensureBody(ctx);
    ctx.body = await mergeValidatedField(definition.body as StandardSchemaV1, ctx.body);
  }
}

function createNext(ctx: PipelineContext, remainder: () => Promise<ReplyResult>): PipelineNext {
  return (state?: Record<string, unknown>) => {
    if (state !== undefined && typeof state === "object" && state !== null) {
      ctx.state = {
        ...ctx.state,
        ...state,
      };
    }
    return remainder();
  };
}

export function middlewareToLayer(definition: MiddlewareDefinition): PipelineLayer {
  return {
    async run(ctx, next) {
      await applyValidators(ctx, definition);

      let nextCalled = false;
      const trackedNext: PipelineNext = (args) => {
        nextCalled = true;
        return next(args);
      };

      const out = await definition.handler(ctx, trackedNext);
      // Preserve prefix-era behavior: nullish return without calling next continues the chain.
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

/**
 * Compose onion layers around a terminal. Outer layers wrap inner ones.
 * Each node coerces output through ensureReplyResult.
 */
export function composePipeline(
  layers: readonly PipelineLayer[],
  terminal: (ctx: PipelineContext) => Promise<unknown>,
): (ctx: PipelineContext) => Promise<ReplyResult> {
  if (layers.length === 0) {
    return async (ctx) => {
      const result = await terminal(ctx);
      return ensureReplyResult(result);
    };
  }

  const dispatch = (index: number, ctx: PipelineContext): Promise<ReplyResult> => {
    if (index >= layers.length) {
      return Promise.resolve(terminal(ctx)).then(ensureReplyResult);
    }

    const layer = layers[index]!;
    const next = createNext(ctx, () => dispatch(index + 1, ctx));

    return Promise.resolve(layer.run(ctx, next)).then(ensureReplyResult);
  };

  return (ctx) => dispatch(0, ctx);
}
