import { t } from "@taserjs/router";
import { cors } from "@taserjs/router/cors";
import { z } from "zod";

const mw = t.middleware((_ctx, next) => next({ appWide: "*" }));
export default t
  .layout("/$")
  .use(cors())
  .use(mw)
  .use((_ctx, next) => next({ appWideChain: "*" }));
