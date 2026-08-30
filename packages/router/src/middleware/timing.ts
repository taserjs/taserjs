import { timing as honoTiming } from "hono/timing";

import { middleware } from "../define/middleware.js";
import { honoMw } from "./hono-mw.js";

export function timing(...args: Parameters<typeof honoTiming>) {
  return middleware(honoMw(honoTiming(...args)));
}

export type TimingOptions = NonNullable<Parameters<typeof honoTiming>[0]>;
