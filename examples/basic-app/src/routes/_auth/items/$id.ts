import { t } from "@taserjs/router";

const mw = t.middleware("/_auth/*", (ctx, next) => next({ other: ctx.state.token }));
export default t
  .layout("/_auth/items/:id")
  .use(mw)
  .use((ctx, next) => next({ paramId: ctx.params.id }));
