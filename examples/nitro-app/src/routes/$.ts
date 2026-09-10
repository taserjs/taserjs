import { t } from "@taserjs/router";

export default t
  .layout("/*")
  .use(async (_ctx, next) => next({ appName: "nitro-app" }));
