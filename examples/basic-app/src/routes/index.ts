import { t } from "@taserjs/router";
import { z } from "zod";

const mw2 = t.middleware("/$").query(z.object({ name: z.string().optional() }));
export default t
  .layout("index")
  .use(mw2)
  .use((_ctx, next) => next());
