import { t } from "@taserjs/router";

export default t
  .layout("/_auth/items/:id/*")
  .use((ctx, next) => next({ innerParamId: ctx.params.id }));
