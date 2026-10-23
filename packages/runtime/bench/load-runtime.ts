import type { CreateTaserApp } from "./scenarios.ts";

const BUILT_RUNTIME_URL = new URL("../dist/index.js", import.meta.url).href;

/**
 * Benchmarks must measure the shipped build. Importing `src` through vite-node costs roughly 18%
 * throughput and changes how V8 optimizes the hot path, which made the relative numbers
 * misleading. The URL is held in a variable so TypeScript does not require `dist` to exist at
 * typecheck time.
 */
export async function loadBuiltCreateTaserApp(): Promise<CreateTaserApp> {
  try {
    const runtime = (await import(BUILT_RUNTIME_URL)) as { createTaserApp: CreateTaserApp };
    return runtime.createTaserApp;
  } catch (error) {
    throw new Error(
      "Could not load packages/runtime/dist. Run `pnpm --filter @taserjs/runtime build` first.",
      { cause: error },
    );
  }
}
