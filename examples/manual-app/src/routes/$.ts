import { t } from "@taserjs/router";
import { cors } from "@taserjs/router/cors";

export default t
  .layout("/*")
  .use(cors())
  .use((_ctx, next) => next({ appName: "manual-app" }));
