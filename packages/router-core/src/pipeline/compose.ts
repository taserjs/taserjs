import { ensureReplyResult, type ReplyResult } from "@taserjs/router-utils";
import type { PipelineContext, PipelineLayer, PipelineNext } from "../types.js";

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

/**
 * Compose onion layers around a terminal handler. Outer layers wrap inner ones.
 * Fast-paths directly to terminal when no layers are registered.
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
