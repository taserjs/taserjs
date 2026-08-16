import type { ReservedContextKey } from "@taserjs/router-core";

import type { ContextDefinition } from "./types/app.js";

type NoReservedKeysConstraint<
  TBoot extends Record<string, unknown>,
  TReq extends Record<string, unknown>,
> = Extract<keyof TBoot | keyof TReq, ReservedContextKey> extends never ? unknown : never;

export function createContext<
  TBoot extends Record<string, unknown> = Record<string, never>,
  TReq extends Record<string, unknown> = Record<string, never>,
>(
  definition: ContextDefinition<TBoot, TReq> & NoReservedKeysConstraint<TBoot, TReq>,
): ContextDefinition<TBoot, TReq> {
  return definition;
}

export type { ContextDefinition, InferAppContext } from "./types/app.js";
