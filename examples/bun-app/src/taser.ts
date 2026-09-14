import { defineTaser } from "@taserjs/router";
import { context } from "./context.js";

export default defineTaser().context(context);
