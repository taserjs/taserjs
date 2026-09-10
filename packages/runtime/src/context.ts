import type { ContextDefinition } from "@taserjs/router";

export { createContext } from "@taserjs/router";

export interface BootManager {
  getBoot: () => Promise<Record<string, unknown>>;
  getBootSync: () => Record<string, unknown> | null;
}

export function createBootManager(
  contextDef?: ContextDefinition<any, any> | undefined,
): BootManager {
  let bootPromise: Promise<Record<string, unknown>> | null = null;
  let bootResult: Record<string, unknown> | null = null;

  const getBootSync = (): Record<string, unknown> | null => {
    return bootResult;
  };

  const getBoot = async (): Promise<Record<string, unknown>> => {
    if (bootResult) return bootResult;
    if (!contextDef?.boot) {
      bootResult = {};
      return bootResult;
    }
    if (!bootPromise) {
      bootPromise = (async () => {
        const res = await contextDef.boot!();
        const data = res ?? {};
        bootResult = data;
        return data;
      })();
    }
    return await bootPromise;
  };

  if (contextDef?.boot) {
    getBoot().catch(() => {});
  } else {
    bootResult = {};
  }

  return { getBoot, getBootSync };
}
