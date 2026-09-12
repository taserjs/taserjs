import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import z from "zod";

const mw = t.middleware("/_auth/*", (_args, next) => next());

export default t
  .get("/token")
  .use(mw)
  .returns({
    200: z.object({ token: z.string() }),
  })
  .handler(({ state }) => {
    return json({ token: state.token });
  });
