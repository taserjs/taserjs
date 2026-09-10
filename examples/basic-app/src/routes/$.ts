import { t } from "@taserjs/router";

export default t.layout("/*").use(async (_args, next) => {
  return await next({ appWide: "*" });
});
