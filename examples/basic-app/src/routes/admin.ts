import { t } from "@taserjs/router";

export default t.layout("/admin/*").use(async (_args, next) => {
  return await next({ adminOnly: true });
});
