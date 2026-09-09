import type { ContextOptions } from "@taserjs/router";

export { createContext } from "@taserjs/router";

export interface BootManager {
  getBoot: () => Promise<Record<string, unknown>>;
}

export function createBootManager(
  contextDef?: ContextOptions | undefined,
): BootManager {
  let bootPromise: Promise<Record<string, unknown>> | null = null;
  let bootResult: Record<string, unknown> | null = null;

  const getBoot = async (): Promise<Record<string, unknown>> => {
    if (bootResult) return bootResult;
    if (!contextDef?.boot) {
      bootResult = {};
      return bootResult;
    }
    if (!bootPromise) {
      bootPromise = (async () => {
        const res = await contextDef.boot!();
        bootResult = res ?? {};
        return bootResult;
      })();
    }
    return await bootPromise;
  };

  if (contextDef?.boot) {
    getBoot().catch(() => {});
  }

  return { getBoot };
}
