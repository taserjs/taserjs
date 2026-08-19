import { timing as honoTiming } from "hono/timing";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const honoTimingMiddleware = wrapHonoMiddleware(honoTiming);

export function timing(...args: Parameters<typeof honoTiming>) {
  return honoTimingMiddleware(...args);
}

export type TimingOptions = NonNullable<Parameters<typeof honoTiming>[0]>;
