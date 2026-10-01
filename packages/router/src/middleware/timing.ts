import { timing as honoTiming } from "hono/timing";

import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type TimingOptions = Parameters<typeof honoTiming>[0];

export function timing(config?: TimingOptions): MiddlewareDefinition {
  return hono(honoTiming(config));
}
