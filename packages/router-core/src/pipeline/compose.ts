import { ensureResponse, isPromise } from "@taserjs/router-utils";
import type { PipelineContext, PipelineLayer, PipelineNext } from "../types.js";

function createNext(ctx: PipelineContext, remainder: () => Promise<Response>): PipelineNext {
  return (state?: Record<string, unknown>) => {
    if (state !== undefined && typeof state === "object" && state !== null) {
      Object.assign(ctx.state, state);
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
  terminal: (ctx: PipelineContext) => unknown,
): (ctx: PipelineContext) => Promise<Response> | Response {
  if (layers.length === 0) {
    return (ctx) => {
      const result = terminal(ctx);
      if (isPromise(result)) {
        return result.then(ensureResponse);
      }
      return ensureResponse(result);
    };
  }

  const dispatch = (index: number, ctx: PipelineContext): Promise<Response> => {
    if (index >= layers.length) {
      return Promise.resolve(terminal(ctx)).then(ensureResponse);
    }

    const layer = layers[index]!;
    const next = createNext(ctx, () => dispatch(index + 1, ctx));

    return Promise.resolve(layer.run(ctx, next)).then(ensureResponse);
  };

  return (ctx) => dispatch(0, ctx);
}
