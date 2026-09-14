import { timing as honoTiming, startTime, endTime, setMetric, wrapTime } from "hono/timing";
import type { TimingVariables } from "hono/timing";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type TimingOptions = Parameters<typeof honoTiming>[0];

export function timing(config?: TimingOptions): MiddlewareDefinition {
  return hono(honoTiming(config));
}

export { startTime, endTime, setMetric, wrapTime };
export type { TimingVariables };
