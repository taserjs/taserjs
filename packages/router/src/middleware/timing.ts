import { timing as honoTiming } from "hono/timing";

import { wrapHonoMiddleware } from "./wrap-hono.js";

const wrapped = wrapHonoMiddleware(honoTiming);

export function timing(...args: Parameters<typeof honoTiming>) {
  return wrapped(...args);
}

export type TimingOptions = NonNullable<Parameters<typeof honoTiming>[0]>;
