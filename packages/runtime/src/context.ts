import type { ContextDefinition, ContextOptions } from "./types.js";

export function createContext<
  TBoot extends Record<string, unknown> = Record<string, unknown>,
  TRequest extends Record<string, unknown> = Record<string, unknown>,
>(options: ContextOptions<TBoot, TRequest>): ContextDefinition<TBoot, TRequest> {
  return {
    kind: "context",
    ...options,
  };
}
