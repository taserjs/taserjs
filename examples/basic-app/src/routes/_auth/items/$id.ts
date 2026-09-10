import { t } from "@taserjs/router";

export default t.layout("/_auth/items/:id/*").use(async ({ req }, next) => {
  return await next({ currentItemId: req.params.id });
});
