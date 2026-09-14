import { t } from "@taserjs/router";

export default t.layout("/_auth/*").use(async (_args, next) => {
  return await next({ token: "auth-token-123" });
});
