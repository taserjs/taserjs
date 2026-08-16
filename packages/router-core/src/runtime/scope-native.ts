export function resolveScopeNative(
  boundNative: unknown | undefined,
  env: unknown,
  executionCtx: unknown,
): unknown {
  if (boundNative !== undefined) {
    return boundNative;
  }
  if (env !== undefined || executionCtx !== undefined) {
    return { env, executionCtx };
  }
  return undefined;
}
