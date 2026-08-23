import { isPromise } from "@taserjs/router-utils";
import { ensureResponse } from "@taserjs/router-utils/reply";
import type { PipelineContext, PipelineLayer, PipelineNext } from "../types.js";

type PipelineFn = (ctx: PipelineContext) => Promise<Response> | Response;

/**
 * Compose onion layers around a terminal handler. Outer layers wrap inner ones.
 * Precompiles the dispatch chain at composition time and fast-paths sync returns.
 */
export function composePipeline(
  layers: readonly PipelineLayer[],
  terminal: (ctx: PipelineContext) => unknown,
): (ctx: PipelineContext) => Promise<Response> | Response {
  let curr: PipelineFn = (ctx) => {
    const result = terminal(ctx);
    if (isPromise(result)) {
      return result.then(ensureResponse);
    }
    return ensureResponse(result);
  };

  if (layers.length === 0) {
    return curr;
  }

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]!;
    const nextFn = curr;
    curr = (ctx) => {
      const next: PipelineNext = (state) => {
        if (state !== undefined && typeof state === "object" && state !== null) {
          Object.assign(ctx.state, state);
        }
        return nextFn(ctx);
      };
      const result = layer.run(ctx, next);
      if (isPromise(result)) {
        return result.then(ensureResponse);
      }
      return ensureResponse(result);
    };
  }

  return curr;
}
