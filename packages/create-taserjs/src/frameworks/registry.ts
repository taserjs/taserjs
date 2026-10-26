import type { FrameworkId } from "../core/types.js";
import { nextjs } from "./nextjs.js";
import { none } from "./none.js";
import { nuxt } from "./nuxt.js";
import { reactRouter } from "./react-router.js";
import { sveltekit } from "./sveltekit.js";
import { tanstackRouter } from "./tanstack-router.js";
import { tanstackStart } from "./tanstack-start.js";
import type { FrameworkDefinition } from "./types.js";
import { viteApp } from "./vite-app.js";

export const FRAMEWORKS: Record<FrameworkId, FrameworkDefinition> = {
  none,
  "tanstack-router": tanstackRouter,
  "react-router": reactRouter,
  "tanstack-start": tanstackStart,
  nextjs,
  nuxt,
  sveltekit,
  vite: viteApp,
};

export const FRAMEWORK_IDS = Object.keys(FRAMEWORKS) as FrameworkId[];

export function getFramework(id: string): FrameworkDefinition {
  const definition = FRAMEWORKS[id as FrameworkId];
  if (!definition) {
    throw new Error(`Unknown framework "${id}". Available: ${FRAMEWORK_IDS.join(", ")}.`);
  }
  return definition;
}
