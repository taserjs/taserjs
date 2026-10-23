import type { ContextDefinition } from "@taserjs/router";

export { createContext } from "@taserjs/router";

export interface BootManager {
  getBoot: () => Promise<Record<string, unknown>>;
  getBootSync: () => Record<string, unknown> | null;
}

export function createBootManager(
  contextDef?: ContextDefinition<any, any> | undefined,
): BootManager {
  const boot = contextDef?.boot;
  if (!boot) {
    const empty: Record<string, unknown> = {};
    return { getBoot: async () => empty, getBootSync: () => empty };
  }

  let bootResult: Record<string, unknown> | null = null;
  const bootPromise = (async () => {
    const data = (await boot()) ?? {};
    bootResult = data;
    return data;
  })();
  // Boot starts immediately; a failure surfaces to the first request awaiting `getBoot`.
  bootPromise.catch(() => {});

  return { getBoot: () => bootPromise, getBootSync: () => bootResult };
}
