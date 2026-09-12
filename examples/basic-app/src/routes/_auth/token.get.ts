import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/token").handler(({ ctx, state, req }) => {
  return json({ token: state.token, params: req.params, id: ctx.requestId });
});
