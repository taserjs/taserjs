import { createTaserApp } from "@taserjs/router";
import { context } from "./context.js";

export default createTaserApp({
  response: { validate: true },
});
