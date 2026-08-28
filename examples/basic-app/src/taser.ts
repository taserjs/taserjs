import { createTaserApp } from "@taserjs/router";
import { context } from "./context.js";

export const t = createTaserApp({
  response: { validate: true },
}).context(context);
